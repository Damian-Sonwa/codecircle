import {Router} from 'express';
import {body} from 'express-validator';
import {
  handleComment,
  handleCreateKnowledge,
  handleListKnowledge,
  handleToggleBookmark,
  handleToggleLike
} from '@/controllers/knowledgeController';
import {handleLeaderboard} from '@/controllers/leaderboardController';
import {authenticate} from '@/middleware/authMiddleware';
import {validate} from '@/utils/validation';

const router = Router();

router.get('/', handleListKnowledge);
router.get('/leaderboard', handleLeaderboard);

router.use(authenticate);

router.post('/', [body('title').notEmpty(), body('summary').notEmpty()], validate, handleCreateKnowledge);
router.post('/:id/bookmark', handleToggleBookmark);
router.post('/:id/like', handleToggleLike);
router.post('/:id/comment', [body('message').notEmpty()], validate, handleComment);

export default router;

