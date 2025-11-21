import {Types} from 'mongoose';
import {MessageModel} from '@/models/Message';
import {ConversationModel} from '@/models/Conversation';
import {HttpError} from '@/middleware/errorHandler';

export const createMessage = async (
  conversationId: Types.ObjectId,
  senderId: Types.ObjectId,
  content?: string,
  media?: any[],
  options?: {replyTo?: Types.ObjectId; isEncrypted?: boolean}
) => {
  const conversation = await ConversationModel.findById(conversationId);
  if (!conversation) {
    throw new HttpError(404, 'Conversation not found');
  }
  if (conversation.locked) {
    throw new HttpError(423, 'Conversation is locked by an administrator');
  }

  const message = await MessageModel.create({
    conversationId,
    senderId,
    content,
    media: media ?? [],
    replyToMessageId: options?.replyTo,
    isEncrypted: options?.isEncrypted ?? false
  });
  return message;
};

export const updateMessage = async (
  messageId: string,
  senderId: Types.ObjectId,
  update: Partial<{content: string; reactions: Record<string, Types.ObjectId[]>; isPinned: boolean}>
) => {
  const message = await MessageModel.findOneAndUpdate({_id: messageId, senderId}, update, {new: true});
  if (!message) {
    throw new HttpError(404, 'Message not found');
  }
  return message;
};

export const deleteMessage = async (messageId: string, senderId: Types.ObjectId) => {
  const message = await MessageModel.findOne({_id: messageId, senderId});
  if (!message) {
    throw new HttpError(404, 'Message not found');
  }
  message.deletedAt = new Date();
  await message.save();
  return message;
};

export const listMessages = async (
  conversationId: string,
  limit: number,
  cursor?: string
) => {
  const query: Record<string, any> = {conversationId};
  if (cursor) {
    query._id = {$lt: cursor};
  }

  const messages = await MessageModel.find(query)
    .sort({_id: -1})
    .limit(limit + 1)
    .lean();

  let nextCursor: string | undefined;
  if (messages.length > limit) {
    const next = messages.pop();
    nextCursor = next?._id.toString();
  }

  return {data: messages.reverse(), nextCursor};
};


