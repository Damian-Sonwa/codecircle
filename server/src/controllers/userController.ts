import {Request, Response} from 'express';
import {Types} from 'mongoose';
import {AuthenticatedRequest} from '@/types';
import {UserModel} from '@/models/User';
import {HttpError} from '@/middleware/errorHandler';
import {getPresence} from '@/services/presenceService';

export const handleMe = async (req: AuthenticatedRequest, res: Response) => {
  const user = await UserModel.findById(req.userId)
    .populate('friends', 'username avatarUrl status skills skillLevel')
    .lean();
  res.json(user);
};

export const handleUpdateProfile = async (req: AuthenticatedRequest, res: Response) => {
  const {username, avatarUrl, settings, bio, skills, skillLevel, socialLinks} = req.body;
  const user = await UserModel.findByIdAndUpdate(
    req.userId,
    {
      $set: {
        username,
        avatarUrl,
        settings,
        bio,
        skills,
        skillLevel,
        socialLinks
      }
    },
    {new: true}
  ).lean();
  res.json(user);
};

export const handleStatus = async (req: AuthenticatedRequest, res: Response) => {
  const {status} = req.body;
  const allowed = ['online', 'offline', 'away'];
  if (!allowed.includes(status)) {
    throw new HttpError(422, 'Invalid status');
  }
  const user = await UserModel.findByIdAndUpdate(
    req.userId,
    {status, lastSeen: status === 'offline' ? new Date() : undefined},
    {new: true}
  ).lean();
  res.json(user);
};

export const handleBlock = async (req: AuthenticatedRequest, res: Response) => {
  const targetId = new Types.ObjectId(req.params.userId);
  const user = await UserModel.findByIdAndUpdate(
    req.userId,
    {$addToSet: {blockedUsers: targetId}},
    {new: true}
  ).lean();
  res.json(user);
};

export const handleUnblock = async (req: AuthenticatedRequest, res: Response) => {
  const targetId = new Types.ObjectId(req.params.userId);
  const user = await UserModel.findByIdAndUpdate(
    req.userId,
    {$pull: {blockedUsers: targetId}},
    {new: true}
  ).lean();
  res.json(user);
};

export const handleSearchUsers = async (req: Request, res: Response) => {
  const {q} = req.query;
  if (!q) {
    return res.json([]);
  }
  const users = await UserModel.find({
    $or: [
      {username: {$regex: q as string, $options: 'i'}},
      {email: {$regex: q as string, $options: 'i'}}
    ]
  })
    .limit(10)
    .lean();
  res.json(users);
};

export const handlePresence = async (req: Request, res: Response) => {
  const {userId} = req.params;
  const status = await getPresence(userId);
  res.json({userId, status});
};

export const handleFriends = async (req: AuthenticatedRequest, res: Response) => {
  const user = await UserModel.findById(req.userId)
    .populate('friends', 'username avatarUrl status skills skillLevel lastSeen')
    .populate('friendRequests', 'username avatarUrl skills')
    .lean();
  res.json({friends: user?.friends ?? [], requests: user?.friendRequests ?? []});
};

export const handleFriendSummary = async (req: Request, res: Response) => {
  const user = await UserModel.findById(req.params.userId).lean();
  res.json({
    _id: user?._id,
    username: user?.username,
    skills: user?.skills,
    skillLevel: user?.skillLevel,
    avatarUrl: user?.avatarUrl,
    bio: user?.bio
  });
};

