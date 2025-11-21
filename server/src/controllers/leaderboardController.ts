import {Request, Response} from 'express';
import {EngagementMetricModel} from '@/models/EngagementMetric';

export const handleLeaderboard = async (_req: Request, res: Response) => {
  const leaderboard = await EngagementMetricModel.find()
    .sort({xp: -1})
    .limit(50)
    .populate('userId', 'username avatarUrl skills skillLevel')
    .lean();
  res.json(leaderboard);
};

