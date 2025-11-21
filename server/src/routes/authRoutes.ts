import {Router} from 'express';
import {body} from 'express-validator';
import {handleLogin, handleLogout, handleRefresh, handleSignup} from '@/controllers/authController';
import {authenticate} from '@/middleware/authMiddleware';
import {validate} from '@/utils/validation';

const router = Router();

router.post(
  '/signup',
  [
    body('username').isLength({min: 3}),
    body('email').isEmail(),
    body('password').isLength({min: 8})
  ],
  validate,
  handleSignup
);

router.post(
  '/login',
  [body('identifier').notEmpty(), body('password').notEmpty()],
  validate,
  handleLogin
);

router.post('/refresh', handleRefresh);
router.post('/logout', authenticate, handleLogout);

export default router;


