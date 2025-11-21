import {Request, Response} from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {v4 as uuid} from 'uuid';
import {HttpError} from '@/middleware/errorHandler';

const uploadsDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, {recursive: true});
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    cb(null, `${uuid()}${path.extname(file.originalname)}`);
  }
});

export const upload = multer({
  storage,
  limits: {fileSize: 25 * 1024 * 1024},
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/', 'video/', 'audio/', 'application/'];
    if (!allowed.some((prefix) => file.mimetype.startsWith(prefix))) {
      return cb(new HttpError(422, 'Unsupported file type'));
    }
    cb(null, true);
  }
});

export const handleFileUpload = (req: Request, res: Response) => {
  if (!req.file) {
    throw new HttpError(422, 'File missing');
  }

  let type: 'image' | 'video' | 'audio' | 'file' = 'file';
  if (req.file.mimetype.startsWith('image/')) type = 'image';
  else if (req.file.mimetype.startsWith('video/')) type = 'video';
  else if (req.file.mimetype.startsWith('audio/')) type = 'audio';

  const file = {
    key: path.basename(req.file.path),
    url: `/uploads/${path.basename(req.file.path)}`,
    size: req.file.size,
    type,
    mimeType: req.file.mimetype
  };

  res.status(201).json(file);
};

