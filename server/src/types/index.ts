import {Request} from 'express';
import {Types} from 'mongoose';

export interface JwtPayload {
  sub: string;
  username: string;
  iat: number;
  exp: number;
}

export interface AuthenticatedRequest extends Request {
  userId?: Types.ObjectId;
  tokenPayload?: JwtPayload;
}

export interface PaginationQuery {
  limit?: number;
  cursor?: string;
}


