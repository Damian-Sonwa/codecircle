import {Router} from 'express';
import {body} from 'express-validator';
import {
  handleDeleteMessage,
  handleListMessages,
  handleReaction,
  handleSendMessage,
  handleUpdateMessage
} from '@/controllers/messageController';
import {authenticate} from '@/middleware/authMiddleware';
import {validate} from '@/utils/validation';

const router = Router({mergeParams: true});

router.use(authenticate);

router.get('/', handleListMessages);
router.post(
  '/',
  [
    body().custom((value) => {
      if (!value.content && (!value.media || value.media.length === 0)) {
        throw new Error('Message must have content or media');
      }
      return true;
    })
  ],
  validate,
  handleSendMessage
);
router.patch('/:id', handleUpdateMessage);
router.delete('/:id', handleDeleteMessage);
router.post('/:id/reactions', [body('emoji').notEmpty()], validate, handleReaction);
router.delete('/:id/reactions/:emoji', handleReaction);

export default router;

