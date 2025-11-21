import {Response} from 'express';
import {Types} from 'mongoose';
import {AuthenticatedRequest} from '@/types';
import {
  deleteMessage,
  deleteUser,
  ensureAdmin,
  getAnalytics,
  lockConversation,
  suspendUser,
  unlockConversation
} from '@/services/adminService';

export const handleAdminGate = async (req: AuthenticatedRequest) => {
  await ensureAdmin(req.userId!);
};

export const handleSuspendUser = async (req: AuthenticatedRequest, res: Response) => {
  await ensureAdmin(req.userId!);
  const user = await suspendUser(new Types.ObjectId(req.params.userId));
  res.json(user);
};

export const handleDeleteUser = async (req: AuthenticatedRequest, res: Response) => {
  await ensureAdmin(req.userId!);
  await deleteUser(new Types.ObjectId(req.params.userId));
  res.status(204).send();
};

export const handleDeleteMessage = async (req: AuthenticatedRequest, res: Response) => {
  await ensureAdmin(req.userId!);
  const message = await deleteMessage(req.params.messageId);
  res.json(message);
};

export const handleLockConversation = async (req: AuthenticatedRequest, res: Response) => {
  await ensureAdmin(req.userId!);
  const conversation = await lockConversation(req.params.conversationId);
  res.json(conversation);
};

export const handleUnlockConversation = async (req: AuthenticatedRequest, res: Response) => {
  await ensureAdmin(req.userId!);
  const conversation = await unlockConversation(req.params.conversationId);
  res.json(conversation);
};

export const handleAnalytics = async (req: AuthenticatedRequest, res: Response) => {
  await ensureAdmin(req.userId!);
  const analytics = await getAnalytics();
  res.json(analytics);
};

