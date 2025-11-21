import {NextFunction, Response} from 'express';
import jwt from 'jsonwebtoken';
import {Types} from 'mongoose';
import {env} from '@/config/env';
import {AuthenticatedRequest, JwtPayload} from '@/types';

export const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : req.cookies?.accessToken;

  if (!token) {
    return res.status(401).json({message: 'Authentication required'});
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret) as JwtPayload;
    req.userId = payload.sub ? new Types.ObjectId(payload.sub) : undefined;
    req.tokenPayload = payload;
    return next();
  } catch (error) {
    return res.status(401).json({message: 'Invalid or expired token'});
  }
};

