import {Router} from 'express';
import {handleFileUpload, upload} from '@/controllers/uploadController';
import {authenticate} from '@/middleware/authMiddleware';

const router = Router();

router.use(authenticate);
router.post('/', upload.single('file'), handleFileUpload);

export default router;


