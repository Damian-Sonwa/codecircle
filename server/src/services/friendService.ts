import {randomUUID} from 'crypto';
import {Types} from 'mongoose';
import {UserModel} from '@/models/User';
import {FriendInviteModel} from '@/models/FriendInvite';

export const createInviteLink = async (userId: Types.ObjectId, channel: string = 'link') => {
  const inviteCode = randomUUID();
  const invite = await FriendInviteModel.create({fromUser: userId, inviteCode, channel});
  return invite;
};

export const acceptInvite = async (inviteCode: string, toUser: Types.ObjectId) => {
  const invite = await FriendInviteModel.findOne({inviteCode});
  if (!invite || invite.status !== 'pending') {
    return null;
  }
  invite.status = 'accepted';
  invite.toUser = toUser;
  await invite.save();
  await Promise.all([
    UserModel.findByIdAndUpdate(invite.fromUser, {$addToSet: {friends: toUser}}),
    UserModel.findByIdAndUpdate(toUser, {$addToSet: {friends: invite.fromUser}})
  ]);
  return invite;
};

export const sendFriendRequest = async (fromUser: Types.ObjectId, toUser: Types.ObjectId) => {
  await UserModel.findByIdAndUpdate(toUser, {$addToSet: {friendRequests: fromUser}});
  return UserModel.findById(toUser);
};

export const respondToFriendRequest = async (userId: Types.ObjectId, requesterId: Types.ObjectId, accept: boolean) => {
  const updates = [UserModel.findByIdAndUpdate(userId, {$pull: {friendRequests: requesterId}})];
  if (accept) {
    updates.push(
      UserModel.findByIdAndUpdate(userId, {$addToSet: {friends: requesterId}}),
      UserModel.findByIdAndUpdate(requesterId, {$addToSet: {friends: userId}})
    );
  }
  await Promise.all(updates);
  return UserModel.findById(userId);
};

