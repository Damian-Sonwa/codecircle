import {Response} from 'express';
import {AuthenticatedRequest} from '@/types';
import {completeOnboarding, markTourCompleted} from '@/services/onboardingService';

export const handleOnboarding = async (req: AuthenticatedRequest, res: Response) => {
  const {skills, skillLevel, answers} = req.body;
  const user = await completeOnboarding(req.userId!, {skills, skillLevel, answers});
  res.json(user);
};

export const handleTourComplete = async (req: AuthenticatedRequest, res: Response) => {
  const user = await markTourCompleted(req.userId!);
  res.json(user);
};

