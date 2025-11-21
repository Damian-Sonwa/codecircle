import jwt, {Secret} from 'jsonwebtoken';
import {env} from '@/config/env';

const accessSecret: Secret = env.jwtSecret;
const refreshSecret: Secret = env.refreshSecret;

export const createAccessToken = (userId: string, username: string) =>
  jwt.sign({sub: userId, username}, accessSecret, {expiresIn: env.jwtExpiresIn});

export const createRefreshToken = (userId: string) =>
  jwt.sign({sub: userId}, refreshSecret, {expiresIn: env.refreshExpiresIn});

export const verifyRefreshToken = (token: string) => jwt.verify(token, refreshSecret);


