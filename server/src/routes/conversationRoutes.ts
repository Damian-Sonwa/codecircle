import {Router} from 'express';
import {body} from 'express-validator';
import {
  handleArchiveConversation,
  handleCreateConversation,
  handleDeleteConversation,
  handleListConversations,
  handlePinConversation,
  handleUnarchiveConversation,
  handleUnpinConversation,
  handleUpdateConversation
} from '@/controllers/conversationController';
import messageRoutes from '@/routes/messageRoutes';
import {authenticate} from '@/middleware/authMiddleware';
import {validate} from '@/utils/validation';

const router = Router();

router.use(authenticate);

router.get('/', handleListConversations);
router.post(
  '/',
  [body('type').isIn(['dm', 'group']), body('participantIds').isArray({min: 1})],
  validate,
  handleCreateConversation
);
router.patch('/:id', handleUpdateConversation);
router.delete('/:id', handleDeleteConversation);
router.post('/:id/pin', handlePinConversation);
router.post('/:id/unpin', handleUnpinConversation);
router.post('/:id/archive', handleArchiveConversation);
router.post('/:id/unarchive', handleUnarchiveConversation);

// Nest message routes under conversations
router.use('/:conversationId/messages', messageRoutes);

export default router;

