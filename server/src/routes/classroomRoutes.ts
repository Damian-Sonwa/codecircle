import {Router} from 'express';
import {body} from 'express-validator';
import {
  handleAddSession,
  handleAttendance,
  handleCreateClassroom,
  handleListClassrooms,
  handleRegisterParticipant,
  handleUpdateMaterials
} from '@/controllers/classroomController';
import {authenticate} from '@/middleware/authMiddleware';
import {validate} from '@/utils/validation';

const router = Router();

router.use(authenticate);

router.get('/', handleListClassrooms);
router.post('/', [body('title').notEmpty()], validate, handleCreateClassroom);
router.post('/:classroomId/sessions', [body('title').notEmpty(), body('date').notEmpty()], validate, handleAddSession);
router.post('/:classroomId/sessions/:sessionId/materials', handleUpdateMaterials);
router.post('/:classroomId/sessions/:sessionId/register', handleRegisterParticipant);
router.post(
  '/:classroomId/sessions/:sessionId/attendance',
  [body('userId').notEmpty(), body('status').isIn(['present', 'absent'])],
  validate,
  handleAttendance
);

export default router;

