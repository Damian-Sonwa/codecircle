import path from 'path';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import morgan from 'morgan';
import authRoutes from '@/routes/authRoutes';
import conversationRoutes from '@/routes/conversationRoutes';
import messageRoutes from '@/routes/messageRoutes';
import userRoutes from '@/routes/userRoutes';
import uploadRoutes from '@/routes/uploadRoutes';
import onboardingRoutes from '@/routes/onboardingRoutes';
import friendRoutes from '@/routes/friendRoutes';
import classroomRoutes from '@/routes/classroomRoutes';
import knowledgeRoutes from '@/routes/knowledgeRoutes';
import adminRoutes from '@/routes/adminRoutes';
import {errorHandler} from '@/middleware/errorHandler';
import {env} from '@/config/env';

export const createApp = () => {
  const app = express();

  app.use(
    cors({
      origin: env.clientUrl,
      credentials: true
    })
  );
  app.use(helmet());
  app.use(express.json({limit: '10mb'}));
  app.use(express.urlencoded({extended: true}));
  app.use(cookieParser());
  app.use(morgan('dev'));
  app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

  app.get('/health', (_req, res) => res.json({status: 'ok'}));
  
  // Root route for Render health checks
  app.get('/', (_req, res) => res.json({status: 'ok', message: 'CodeCircle API Server'}));

  app.use('/api/auth', authRoutes);
  app.use('/api/conversations', conversationRoutes);
  // Message routes are nested under conversations - handled in conversationRoutes
  app.use('/api/users', userRoutes);
  app.use('/api/uploads', uploadRoutes);
  app.use('/api/onboarding', onboardingRoutes);
  app.use('/api/friends', friendRoutes);
  app.use('/api/classrooms', classroomRoutes);
  app.use('/api/knowledge', knowledgeRoutes);
  app.use('/api/admin', adminRoutes);

  app.use(errorHandler);

  return app;
};

