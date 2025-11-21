import {Request, Response} from 'express';
import {Types} from 'mongoose';
import {AuthenticatedRequest} from '@/types';
import {MessageModel} from '@/models/Message';
import {createMessage, deleteMessage, listMessages, updateMessage} from '@/services/messageService';
import {HttpError} from '@/middleware/errorHandler';

export const handleSendMessage = async (req: AuthenticatedRequest, res: Response) => {
  const {conversationId} = req.params;
  const {content, replyToMessageId, isEncrypted, media} = req.body;
  const message = await createMessage(
    new Types.ObjectId(conversationId),
    req.userId!,
    content,
    media,
    {
      replyTo: replyToMessageId ? new Types.ObjectId(replyToMessageId) : undefined,
      isEncrypted
    }
  );
  res.status(201).json(message);
};

export const handleListMessages = async (req: Request, res: Response) => {
  const {limit = 30, cursor} = req.query;
  const {conversationId} = req.params;
  const result = await listMessages(conversationId, Number(limit), cursor as string | undefined);
  res.json(result);
};

export const handleUpdateMessage = async (req: AuthenticatedRequest, res: Response) => {
  const message = await updateMessage(req.params.id, req.userId!, req.body);
  res.json(message);
};

export const handleDeleteMessage = async (req: AuthenticatedRequest, res: Response) => {
  const message = await deleteMessage(req.params.id, req.userId!);
  res.json(message);
};

export const handleReaction = async (req: AuthenticatedRequest, res: Response) => {
  const emoji = req.method === 'DELETE' ? req.params.emoji : req.body.emoji;
  if (!emoji) {
    throw new HttpError(422, 'Emoji is required');
  }

  const update = req.method === 'DELETE' ? {$pull: {[`reactions.${emoji}`]: req.userId}} : {$addToSet: {[`reactions.${emoji}`]: req.userId}};
  const message = await MessageModel.findByIdAndUpdate(req.params.id, update, {new: true});
  res.json(message);
};

