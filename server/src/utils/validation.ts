import {validationResult} from 'express-validator';
import {NextFunction, Request, Response} from 'express';
import {HttpError} from '@/middleware/errorHandler';

export const validate = (req: Request, _res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError(422, 'Validation failed', errors.array()));
  }
  return next();
};


