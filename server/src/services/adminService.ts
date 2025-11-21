import {Types} from 'mongoose';
import {UserModel} from '@/models/User';
import {ConversationModel} from '@/models/Conversation';
import {MessageModel} from '@/models/Message';
import {EngagementMetricModel} from '@/models/EngagementMetric';
import {HttpError} from '@/middleware/errorHandler';

export const ensureAdmin = async (userId: Types.ObjectId) => {
  const user = await UserModel.findById(userId);
  if (!user || user.role !== 'admin') {
    throw new HttpError(403, 'Admin privileges required');
  }
};

export const suspendUser = async (userId: Types.ObjectId) => {
  return UserModel.findByIdAndUpdate(userId, {status: 'offline'}, {new: true});
};

export const deleteUser = async (userId: Types.ObjectId) => {
  await UserModel.findByIdAndDelete(userId);
  await MessageModel.deleteMany({senderId: userId});
  return ConversationModel.updateMany({}, {$pull: {participants: userId}});
};

export const deleteMessage = async (messageId: string) => {
  return MessageModel.findByIdAndUpdate(messageId, {deletedAt: new Date()}, {new: true});
};

export const lockConversation = async (conversationId: string) => {
  return ConversationModel.findByIdAndUpdate(conversationId, {$set: {locked: true}}, {new: true});
};

export const unlockConversation = async (conversationId: string) => {
  return ConversationModel.findByIdAndUpdate(conversationId, {$unset: {locked: ''}}, {new: true});
};

export const getAnalytics = async () => {
  const [userCount, messageCount, leaderboard] = await Promise.all([
    UserModel.countDocuments(),
    MessageModel.countDocuments(),
    EngagementMetricModel.find().sort({xp: -1}).limit(20).populate('userId', 'username avatarUrl')
  ]);

  return {
    userCount,
    messageCount,
    leaderboard
  };
};

