import bcrypt from 'bcrypt';
import {Types} from 'mongoose';
import {UserModel} from '@/models/User';
import {createAccessToken, createRefreshToken} from '@/utils/token';
import {HttpError} from '@/middleware/errorHandler';

const SALT_ROUNDS = 12;

export const signup = async (username: string, email: string, password: string) => {
  const existing = await UserModel.findOne({$or: [{email}, {username}]});
  if (existing) {
    throw new HttpError(409, 'User already exists');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await UserModel.create({username, email, passwordHash});

  const accessToken = createAccessToken(user.id, user.username);
  const refreshToken = createRefreshToken(user.id);

  return {user, tokens: {accessToken, refreshToken}};
};

export const login = async (identifier: string, password: string) => {
  const user = await UserModel.findOne({$or: [{email: identifier}, {username: identifier}]});
  if (!user) {
    throw new HttpError(401, 'Invalid credentials');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new HttpError(401, 'Invalid credentials');
  }

  user.status = 'online';
  await user.save();

  const accessToken = createAccessToken(user.id, user.username);
  const refreshToken = createRefreshToken(user.id);

  return {user, tokens: {accessToken, refreshToken}};
};

export const logout = async (userId: Types.ObjectId) => {
  await UserModel.findByIdAndUpdate(userId, {status: 'offline', lastSeen: new Date()});
};


