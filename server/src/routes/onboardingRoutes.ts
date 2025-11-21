import {Router} from 'express';
import {body} from 'express-validator';
import {authenticate} from '@/middleware/authMiddleware';
import {validate} from '@/utils/validation';
import {handleOnboarding, handleTourComplete} from '@/controllers/onboardingController';

const router = Router();

router.use(authenticate);

router.post(
  '/',
  [body('skills').isArray({min: 1}), body('skillLevel').isIn(['Beginner', 'Intermediate', 'Professional'])],
  validate,
  handleOnboarding
);

router.post('/tour-complete', handleTourComplete);

export default router;

