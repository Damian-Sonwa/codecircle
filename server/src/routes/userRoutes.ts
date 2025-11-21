import {Router} from 'express';
import {body} from 'express-validator';
import {
  handleBlock,
  handleFriendSummary,
  handleFriends,
  handleMe,
  handlePresence,
  handleSearchUsers,
  handleStatus,
  handleUnblock,
  handleUpdateProfile
} from '@/controllers/userController';
import {authenticate} from '@/middleware/authMiddleware';
import {validate} from '@/utils/validation';

const router = Router();

router.get('/search', handleSearchUsers);

router.use(authenticate);

router.get('/friends', handleFriends);
router.get('/:userId/presence', handlePresence);
router.get('/:userId/summary', handleFriendSummary);
router.get('/me', handleMe);
router.patch(
  '/me',
  [body('username').optional().isLength({min: 3})],
  validate,
  handleUpdateProfile
);
router.post('/status', [body('status').isIn(['online', 'offline', 'away'])], validate, handleStatus);
router.post('/:userId/block', handleBlock);
router.post('/:userId/unblock', handleUnblock);

export default router;

