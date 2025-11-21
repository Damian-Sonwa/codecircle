import {Router} from 'express';
import {body} from 'express-validator';
import {
  handleAcceptInvite,
  handleCreateInvite,
  handleRespondFriendRequest,
  handleSendFriendRequest
} from '@/controllers/friendController';
import {authenticate} from '@/middleware/authMiddleware';
import {validate} from '@/utils/validation';

const router = Router();

router.use(authenticate);

router.post('/invite', handleCreateInvite);
router.post('/invite/:code/accept', handleAcceptInvite);
router.post('/request', [body('targetUserId').isString()], validate, handleSendFriendRequest);
router.post('/request/:requesterId/respond', handleRespondFriendRequest);

export default router;

