import {Router} from 'express';
import {
  handleAnalytics,
  handleDeleteMessage,
  handleDeleteUser,
  handleLockConversation,
  handleSuspendUser,
  handleUnlockConversation,
  handleAdminGate
} from '@/controllers/adminController';
import {authenticate} from '@/middleware/authMiddleware';
import {AuthenticatedRequest} from '@/types';

const router = Router();

router.use(authenticate);
router.use(async (req, res, next) => {
  await handleAdminGate(req as AuthenticatedRequest);
  next();
});

router.get('/analytics', handleAnalytics);
router.post('/users/:userId/suspend', handleSuspendUser);
router.delete('/users/:userId', handleDeleteUser);
router.delete('/messages/:messageId', handleDeleteMessage);
router.post('/conversations/:conversationId/lock', handleLockConversation);
router.post('/conversations/:conversationId/unlock', handleUnlockConversation);

export default router;

