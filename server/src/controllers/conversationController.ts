import {Response} from 'express';
import {Types} from 'mongoose';
import {AuthenticatedRequest} from '@/types';
import {createConversation, deleteConversation, listConversations, updateConversation} from '@/services/conversationService';
import {ConversationModel} from '@/models/Conversation';

export const handleCreateConversation = async (req: AuthenticatedRequest, res: Response) => {
  const {type, participantIds, title} = req.body;
  const participants = (participantIds as string[]).map((id) => new Types.ObjectId(id));
  if (req.userId && !participants.find((p) => p.equals(req.userId!))) {
    participants.push(req.userId);
  }
  const conversation = await createConversation(type, participants, title);
  res.status(201).json(conversation);
};

export const handleListConversations = async (req: AuthenticatedRequest, res: Response) => {
  const conversations = await listConversations(req.userId!);
  res.json(conversations);
};

export const handleUpdateConversation = async (req: AuthenticatedRequest, res: Response) => {
  const conversation = await updateConversation(req.params.id, req.body);
  res.json(conversation);
};

export const handleDeleteConversation = async (req: AuthenticatedRequest, res: Response) => {
  await deleteConversation(req.params.id);
  res.status(204).send();
};

export const handlePinConversation = async (req: AuthenticatedRequest, res: Response) => {
  const conversation = await ConversationModel.findByIdAndUpdate(
    req.params.id,
    {$addToSet: {pinnedBy: req.userId}},
    {new: true}
  );
  res.json(conversation);
};

export const handleUnpinConversation = async (req: AuthenticatedRequest, res: Response) => {
  const conversation = await ConversationModel.findByIdAndUpdate(
    req.params.id,
    {$pull: {pinnedBy: req.userId}},
    {new: true}
  );
  res.json(conversation);
};

export const handleArchiveConversation = async (req: AuthenticatedRequest, res: Response) => {
  const conversation = await ConversationModel.findByIdAndUpdate(
    req.params.id,
    {$addToSet: {archivedBy: req.userId}},
    {new: true}
  );
  res.json(conversation);
};

export const handleUnarchiveConversation = async (req: AuthenticatedRequest, res: Response) => {
  const conversation = await ConversationModel.findByIdAndUpdate(
    req.params.id,
    {$pull: {archivedBy: req.userId}},
    {new: true}
  );
  res.json(conversation);
};

