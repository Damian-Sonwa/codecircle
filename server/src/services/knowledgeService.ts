import {Types} from 'mongoose';
import {KnowledgePostModel} from '@/models/KnowledgePost';
import {EngagementMetricModel} from '@/models/EngagementMetric';

export const listKnowledgePosts = (filter: {tag?: string; type?: string} = {}) => {
  const query: Record<string, unknown> = {};
  if (filter.tag) {
    query.tags = filter.tag;
  }
  if (filter.type) {
    query.type = filter.type;
  }
  return KnowledgePostModel.find(query).sort({createdAt: -1}).limit(100).lean();
};

export const createKnowledgePost = async (
  payload: {
    title: string;
    summary: string;
    content?: string;
    tags?: string[];
    type?: 'tutorial' | 'blog' | 'quiz' | 'daily-bite';
  },
  author: Types.ObjectId
) => {
  await EngagementMetricModel.findOneAndUpdate(
    {userId: author},
    {$inc: {materialsShared: 1, xp: 12}},
    {upsert: true}
  );
  return KnowledgePostModel.create({...payload, author});
};

export const toggleBookmark = async (postId: string, userId: Types.ObjectId) => {
  const post = await KnowledgePostModel.findById(postId);
  if (!post) return null;
  const hasBookmark = post.bookmarks.some((item) => item.equals(userId));
  if (hasBookmark) {
    post.bookmarks = post.bookmarks.filter((item) => !item.equals(userId));
  } else {
    post.bookmarks.push(userId);
  }
  await post.save();
  return post;
};

export const addKnowledgeReaction = async (
  postId: string,
  userId: Types.ObjectId,
  message: string
) => {
  await EngagementMetricModel.findOneAndUpdate(
    {userId},
    {$inc: {xp: 5}},
    {upsert: true}
  );
  return KnowledgePostModel.findByIdAndUpdate(
    postId,
    {$push: {comments: {author: userId, message}}},
    {new: true}
  );
};

export const toggleLike = async (postId: string, userId: Types.ObjectId) => {
  const post = await KnowledgePostModel.findById(postId);
  if (!post) return null;
  const hasLiked = post.likes.some((item) => item.equals(userId));
  if (hasLiked) {
    post.likes = post.likes.filter((item) => !item.equals(userId));
  } else {
    post.likes.push(userId);
  }
  await post.save();
  return post;
};

