import {Types} from 'mongoose';
import {ConversationModel} from '@/models/Conversation';
import {MessageModel} from '@/models/Message';
import {HttpError} from '@/middleware/errorHandler';

export const createConversation = async (
  type: 'dm' | 'group',
  participantIds: Types.ObjectId[],
  title?: string
) => {
  if (type === 'dm' && participantIds.length !== 2) {
    throw new HttpError(422, 'Direct messages must include exactly two participants');
  }

  const conversation = await ConversationModel.create({type, title, participants: participantIds});
  return conversation;
};

export const listConversations = async (userId: Types.ObjectId) => {
  return ConversationModel.find({participants: userId}).sort({updatedAt: -1}).lean();
};

export const updateConversation = async (
  conversationId: string,
  updates: Partial<{title: string; pinnedBy: Types.ObjectId[]; archivedBy: Types.ObjectId[]; locked: boolean}>
) => {
  const conversation = await ConversationModel.findByIdAndUpdate(conversationId, updates, {new: true});
  if (!conversation) {
    throw new HttpError(404, 'Conversation not found');
  }
  return conversation;
};

export const deleteConversation = async (conversationId: string) => {
  await MessageModel.deleteMany({conversationId});
  await ConversationModel.findByIdAndDelete(conversationId);
};


