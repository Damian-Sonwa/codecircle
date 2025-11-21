import {Request, Response} from 'express';
import jwt from 'jsonwebtoken';
import {signup, login, logout} from '@/services/authService';
import {verifyRefreshToken, createAccessToken} from '@/utils/token';
import {env} from '@/config/env';
import {HttpError} from '@/middleware/errorHandler';
import {AuthenticatedRequest} from '@/types';
import {UserModel} from '@/models/User';

const cookieOptions = {
  httpOnly: true,
  secure: env.nodeEnv === 'production',
  sameSite: 'lax' as const,
  maxAge: 1000 * 60 * 60 * 24 * 7
};

export const handleSignup = async (req: Request, res: Response) => {
  const {username, email, password} = req.body;
  const result = await signup(username, email, password);
  res
    .cookie('accessToken', result.tokens.accessToken, cookieOptions)
    .cookie('refreshToken', result.tokens.refreshToken, {...cookieOptions, maxAge: 1000 * 60 * 60 * 24 * 30})
    .status(201)
    .json({user: result.user, tokens: result.tokens});
};

export const handleLogin = async (req: Request, res: Response) => {
  const {identifier, password} = req.body;
  const result = await login(identifier, password);
  res
    .cookie('accessToken', result.tokens.accessToken, cookieOptions)
    .cookie('refreshToken', result.tokens.refreshToken, {...cookieOptions, maxAge: 1000 * 60 * 60 * 24 * 30})
    .json({user: result.user, tokens: result.tokens});
};

export const handleRefresh = async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken ?? req.body.refreshToken;
  if (!token) {
    throw new HttpError(401, 'Refresh token missing');
  }
  const payload = verifyRefreshToken(token) as jwt.JwtPayload;
  const user = await UserModel.findById(payload.sub).lean();
  if (!user) {
    throw new HttpError(401, 'User not found for refresh token');
  }
  const accessToken = createAccessToken(user._id.toString(), user.username);
  res.cookie('accessToken', accessToken, cookieOptions).json({accessToken});
};

export const handleLogout = async (req: AuthenticatedRequest, res: Response) => {
  if (req.userId) {
    await logout(req.userId);
  }
  res.clearCookie('accessToken').clearCookie('refreshToken').status(204).send();
};


