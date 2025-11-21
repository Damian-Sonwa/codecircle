import {Request, Response} from 'express';
import {AuthenticatedRequest} from '@/types';
import {
  addKnowledgeReaction,
  createKnowledgePost,
  listKnowledgePosts,
  toggleBookmark,
  toggleLike
} from '@/services/knowledgeService';

export const handleListKnowledge = async (req: Request, res: Response) => {
  const posts = await listKnowledgePosts({tag: req.query.tag as string, type: req.query.type as string});
  res.json(posts);
};

export const handleCreateKnowledge = async (req: AuthenticatedRequest, res: Response) => {
  const post = await createKnowledgePost(req.body, req.userId!);
  res.status(201).json(post);
};

export const handleToggleBookmark = async (req: AuthenticatedRequest, res: Response) => {
  const post = await toggleBookmark(req.params.id, req.userId!);
  res.json(post);
};

export const handleToggleLike = async (req: AuthenticatedRequest, res: Response) => {
  const post = await toggleLike(req.params.id, req.userId!);
  res.json(post);
};

export const handleComment = async (req: AuthenticatedRequest, res: Response) => {
  const post = await addKnowledgeReaction(req.params.id, req.userId!, req.body.message);
  res.json(post);
};

