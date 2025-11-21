import {Server, Socket} from 'socket.io';
import {Types} from 'mongoose';
import jwt from 'jsonwebtoken';
import {env} from '@/config/env';
import {MessageModel} from '@/models/Message';
import {ConversationModel} from '@/models/Conversation';
import {UserModel} from '@/models/User';
import {createMessage} from '@/services/messageService';
import {setPresence} from '@/services/presenceService';
import {EngagementMetricModel} from '@/models/EngagementMetric';

interface ServerToClientEvents {
  'presence:update': {userId: string; status: string; lastSeen?: string};
  'conversation:created': any;
  'conversation:updated': any;
  'conversation:deleted': {conversationId: string};
  'message:new': any;
  'message:updated': any;
  'message:deleted': {messageId: string; conversationId: string};
  'typing:start': {conversationId: string; userId: string};
  'typing:stop': {conversationId: string; userId: string};
  'reaction:added': {messageId: string; emoji: string; userId: string};
  'reaction:removed': {messageId: string; emoji: string; userId: string};
  'delivery:receipt': {conversationId: string; messageIds: string[]; userId: string};
  'read:receipt': {conversationId: string; messageIds: string[]; userId: string};
}

interface ClientToServerEvents {
  'auth:connect': {token: string};
  'conversation:join': {conversationId: string};
  'conversation:leave': {conversationId: string};
  'message:send': {
    conversationId: string;
    content?: string;
    media?: any[];
    replyToMessageId?: string;
    isEncrypted?: boolean;
  };
  'message:edit': {messageId: string; content: string};
  'message:delete': {messageId: string; conversationId: string};
  'typing:start': {conversationId: string};
  'typing:stop': {conversationId: string};
  'reaction:add': {messageId: string; emoji: string};
  'reaction:remove': {messageId: string; emoji: string};
  'delivery:ack': {conversationId: string; messageIds: string[]};
  'read:ack': {conversationId: string; messageIds: string[]};
}

type InterServerEvents = Record<string, never>;
type SocketData = {userId?: string};

export const registerSocketEvents = (io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>) => {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const payload = jwt.verify(token, env.jwtSecret) as jwt.JwtPayload;
      socket.data.userId = payload.sub as string;
      next();
    } catch (error) {
      next(error);
    }
  });

  io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>) => {
    const userId = socket.data.userId!;
    setPresence(userId, 'online').catch(console.error);
    io.emit('presence:update', {userId, status: 'online'});

    socket.on('conversation:join', ({conversationId}) => {
      socket.join(conversationId);
    });

    socket.on('conversation:leave', ({conversationId}) => {
      socket.leave(conversationId);
    });

    socket.on('message:send', async ({conversationId, content, media, replyToMessageId, isEncrypted}) => {
      const message = await createMessage(
        new Types.ObjectId(conversationId),
        new Types.ObjectId(userId),
        content,
        media,
        {replyTo: replyToMessageId ? new Types.ObjectId(replyToMessageId) : undefined, isEncrypted}
      );
      io.to(conversationId).emit('message:new', message);
      await ConversationModel.findByIdAndUpdate(conversationId, {updatedAt: new Date()});
      await EngagementMetricModel.findOneAndUpdate(
        {userId: new Types.ObjectId(userId)},
        {$inc: {messagesSent: 1, xp: 5}},
        {upsert: true}
      );
    });

    socket.on('message:edit', async ({messageId, content}) => {
      const message = await MessageModel.findOneAndUpdate(
        {_id: messageId, senderId: userId},
        {content, editedAt: new Date()},
        {new: true}
      );
      if (message) {
        io.to(message.conversationId.toString()).emit('message:updated', message);
      }
    });

    socket.on('message:delete', async ({messageId, conversationId}) => {
      const message = await MessageModel.findOneAndUpdate(
        {_id: messageId, senderId: userId},
        {deletedAt: new Date()},
        {new: true}
      );
      if (message) {
        io.to(conversationId).emit('message:deleted', {messageId, conversationId});
      }
    });

    socket.on('typing:start', ({conversationId}) => {
      socket.to(conversationId).emit('typing:start', {conversationId, userId});
    });

    socket.on('typing:stop', ({conversationId}) => {
      socket.to(conversationId).emit('typing:stop', {conversationId, userId});
    });

    socket.on('reaction:add', async ({messageId, emoji}) => {
      await MessageModel.updateOne({_id: messageId}, {$addToSet: {[`reactions.${emoji}`]: new Types.ObjectId(userId)}});
      const message = await MessageModel.findById(messageId);
      if (message) {
        io.to(message.conversationId.toString()).emit('reaction:added', {messageId, emoji, userId});
      }
    });

    socket.on('reaction:remove', async ({messageId, emoji}) => {
      await MessageModel.updateOne({_id: messageId}, {$pull: {[`reactions.${emoji}`]: new Types.ObjectId(userId)}});
      const message = await MessageModel.findById(messageId);
      if (message) {
        io.to(message.conversationId.toString()).emit('reaction:removed', {messageId, emoji, userId});
      }
    });

    socket.on('delivery:ack', async ({conversationId, messageIds}) => {
      await MessageModel.updateMany({_id: {$in: messageIds}}, {$addToSet: {deliveredTo: new Types.ObjectId(userId)}});
      socket.to(conversationId).emit('delivery:receipt', {conversationId, messageIds, userId});
    });

    socket.on('read:ack', async ({conversationId, messageIds}) => {
      await MessageModel.updateMany({_id: {$in: messageIds}}, {$addToSet: {readBy: new Types.ObjectId(userId)}});
      socket.to(conversationId).emit('read:receipt', {conversationId, messageIds, userId});
    });

    socket.on('disconnect', async () => {
      const user = await UserModel.findByIdAndUpdate(userId, {status: 'offline', lastSeen: new Date()}, {new: true});
      io.emit('presence:update', {userId, status: 'offline', lastSeen: user?.lastSeen?.toISOString()});
    });
  });
};


