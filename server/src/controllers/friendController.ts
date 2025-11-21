import {Response} from 'express';
import {Types} from 'mongoose';
import {AuthenticatedRequest} from '@/types';
import {acceptInvite, createInviteLink, respondToFriendRequest, sendFriendRequest} from '@/services/friendService';

export const handleCreateInvite = async (req: AuthenticatedRequest, res: Response) => {
  const {channel} = req.body;
  const invite = await createInviteLink(req.userId!, channel);
  res.status(201).json(invite);
};

export const handleAcceptInvite = async (req: AuthenticatedRequest, res: Response) => {
  const {code} = req.params;
  const invite = await acceptInvite(code, req.userId!);
  res.json(invite);
};

export const handleSendFriendRequest = async (req: AuthenticatedRequest, res: Response) => {
  const {targetUserId} = req.body;
  await sendFriendRequest(req.userId!, new Types.ObjectId(targetUserId));
  res.status(202).json({ok: true});
};

export const handleRespondFriendRequest = async (req: AuthenticatedRequest, res: Response) => {
  const {requesterId} = req.params;
  const {accept} = req.body;
  const user = await respondToFriendRequest(
    req.userId!,
    new Types.ObjectId(requesterId),
    accept
  );
  res.json(user);
};

