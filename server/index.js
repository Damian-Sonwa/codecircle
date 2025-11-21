import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import session from 'express-session';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { promises as fs } from 'fs';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import translate from '@vitalets/google-translate-api';

// Load .env from server directory FIRST - before any imports that need env vars
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

// Now import modules that depend on env vars
import './config/database.js'; // Import to trigger MongoDB connection
import passport from './config/passport.js';
import User from './models/User.js';
import TechGroup from './models/TechGroup.js';
import PrivateChat from './models/PrivateChat.js';
import TrainingRequest from './models/TrainingRequest.js';
import AdminLog from './models/AdminLog.js';
import Violation from './models/Violation.js';
import ClassroomRequest from './models/ClassroomRequest.js';

const app = express();
const httpServer = createServer(app);
const uploadsDir = join(__dirname, 'uploads');
fs.mkdir(uploadsDir, { recursive: true }).catch((error) => {
  console.error('Failed to ensure uploads directory', error);
});

app.use('/uploads', express.static(uploadsDir));

// CORS configuration - must be before other middleware
const rawOrigins =
  process.env.ALLOWED_ORIGINS ||
  process.env.CLIENT_URL ||
  'http://localhost:5173';
const allowedOrigins = rawOrigins
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }
    const normalizedOrigin = origin.replace(/\/$/, '');
    if (allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }
    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Session configuration for OAuth
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'chaturway-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Body parsing middleware - must be before routes
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true }));

// Socket.io configuration
const io = new Server(httpServer, {
  cors: corsOptions,
  transports: ['websocket', 'polling']
});

app.set('io', io);

// In-memory storage for active connections
const userSockets = new Map(); // userId -> socketId

const AUTO_ARCHIVE_DAYS = parseInt(process.env.AUTO_ARCHIVE_DAYS || '30', 10);
const JWT_SECRET = process.env.JWT_SECRET || 'chaturway-dev-secret';
const VIOLATION_LIMIT = parseInt(process.env.VIOLATION_LIMIT || '3', 10);
const BANNED_WORDS = (process.env.BANNED_WORDS || 'spam,scam,abuse').split(',').map((w) => w.trim().toLowerCase());

const signToken = (user) =>
  jwt.sign(
    { userId: user.userId, role: user.role, username: user.username },
    JWT_SECRET,
    { expiresIn: '1d' }
  );

const authenticateJWT = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token required' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const dbUser = await User.findOne({ userId: decoded.userId });
    if (!dbUser) {
      return res.status(401).json({ error: 'User no longer exists' });
    }
    if (dbUser.status === 'suspended') {
      return res.status(403).json({ error: 'Account suspended' });
    }
    if (dbUser.status === 'deleted') {
      return res.status(403).json({ error: 'Account deleted' });
    }
    req.user = {
      userId: dbUser.userId,
      role: dbUser.role,
      username: dbUser.username,
    };
    req.currentUser = dbUser;
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'superadmin')) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  return next();
};

const requireSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Superadmin access required' });
  }
  return next();
};

const autoArchiveTechGroupMessages = async (group) => {
  if (!group || !Array.isArray(group.messages) || group.messages.length === 0) {
    return;
  }
  const cutoff = new Date(Date.now() - AUTO_ARCHIVE_DAYS * 24 * 60 * 60 * 1000);
  let changed = false;
  group.messages.forEach((msg) => {
    if (!msg.isArchived && msg.timestamp && msg.timestamp < cutoff) {
      msg.isArchived = true;
      msg.archivedAt = new Date();
      changed = true;
    }
  });
  if (changed) {
    await group.save();
  }
};

const autoArchivePrivateChatMessages = async (chat) => {
  if (!chat || !Array.isArray(chat.messages) || chat.messages.length === 0) {
    return;
  }
  const cutoff = new Date(Date.now() - AUTO_ARCHIVE_DAYS * 24 * 60 * 60 * 1000);
  let changed = false;
  chat.messages.forEach((msg) => {
    if (!msg.isArchived && msg.timestamp && msg.timestamp < cutoff) {
      msg.isArchived = true;
      msg.archivedAt = new Date();
      changed = true;
    }
  });
  if (changed) {
    await chat.save();
  }
};

const serializeMessageTimestamps = (message) => ({
  ...message.toObject?.() || message,
  timestamp:
    (message.timestamp instanceof Date ? message.timestamp.toISOString() : message.timestamp) ||
    new Date().toISOString(),
  archivedAt:
    message.archivedAt instanceof Date ? message.archivedAt.toISOString() : message.archivedAt,
});

const filterActiveMessages = (messages = []) =>
  messages.filter((msg) => !msg.isArchived).map(serializeMessageTimestamps);

const generateId = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

const dropIndexIfExists = async (collection, matcher, label) => {
  if (!collection?.indexes) return;
  try {
    const indexes = await collection.indexes();
    for (const index of indexes) {
      if (matcher(index)) {
        await collection.dropIndex(index.name);
        console.log(`🧹 Removed legacy index (${label}): ${index.name}`);
      }
    }
  } catch (error) {
    if (error.codeName !== 'IndexNotFound' && error.code !== 27) {
      console.warn(`⚠️ Unable to drop ${label} index:`, error.message);
    }
  }
};

const ensureIndexes = async () => {
  if (!TechGroup?.collection) return;
  await dropIndexIfExists(
    TechGroup.collection,
    (index) => index?.name === 'joinRequests.requestId_1',
    'joinRequests.requestId'
  );
  await dropIndexIfExists(
    TechGroup.collection,
    (index) =>
      index?.key && Object.keys(index.key).length === 1 && index.key['messages.messageId'] === 1,
    'messages.messageId'
  );
};

const CORE_GROUPS = [
  {
    name: 'General Announcements',
    description:
      'Stay in sync with platform-wide updates, product releases, and industry highlights.',
    topics: ['Announcements'],
    seedMessages: [
      {
        username: 'Announcements',
        message:
          '📰 **NVIDIA launches Blackwell AI platform — TechCrunch** (https://techcrunch.com/2024/03/18/nvidia-unveils-blackwell-ai-platform/)\nNVIDIA introduced its Blackwell platform, designed to run trillion-parameter models with far less energy, signaling another leap for advanced AI infrastructure. Analysts expect cloud providers and enterprises alike to race toward adoption over the next year.\n💬 **Discussion:** How could more efficient AI hardware change competitive dynamics for African startups and research labs?',
      },
    ],
  },
  {
    name: 'CodeCircle Welcome Lounge',
    description:
      'Kick-start your journey with community guidelines, FAQs, and navigation tips.',
    topics: ['Welcome'],
    seedMessages: [
      {
        username: 'Welcome Bot',
        message:
          '🤗 **Welcome home, builder!** Whether you craft code, inspire teams, design products, or just love exploring what technology can do, this lounge is your warm landing pad. We gather here to learn together, swap ideas, and celebrate every win—big or small.',
      },
      {
        username: 'Welcome Bot',
        message:
          '🌍 **Why we’re here:** CodeCircle is a global tech family built for learning, collaboration, and cross-cultural innovation. Share problems you are wrestling with, drop resources that changed your workflow, and help someone else level up today.',
      },
      {
        username: 'Welcome Bot',
        message:
          '💬 **Say hello:** Tell us who you are, where you’re tuning in from, and the tech problem (or passion project) currently lighting you up. We can’t wait to cheer you on!',
      },
      {
        username: 'Welcome Bot',
        message:
          '🛡️ **Community guardrails:** Lead with respect and curiosity. Credit sources when you share news, be mindful of cultural differences, and keep collaborations transparent.',
      },
    ],
  },
];

const seedGroupMessagesIfEmpty = async (group, seedMessages = []) => {
  if (!Array.isArray(seedMessages) || seedMessages.length === 0) {
    return;
  }

  const existingMessages = Array.isArray(group.messages) ? group.messages : [];
  const existingBodies = new Set(
    existingMessages.map((msg) => (typeof msg.message === 'string' ? msg.message.trim() : ''))
  );

  const now = new Date();
  let updated = false;

  seedMessages.forEach((entry) => {
    const { message = '', username = 'Announcements' } =
      typeof entry === 'string' ? { message: entry, username: 'Announcements' } : entry;
    const trimmed = message.trim();
    if (!trimmed || existingBodies.has(trimmed)) {
      return;
    }
    existingBodies.add(trimmed);
    group.messages.push({
      messageId: generateId(),
      groupId: group.groupId,
      userId: 'system',
      username,
      message: trimmed,
      attachments: [],
      voiceNote: null,
      timestamp: now,
      reactions: {},
      readBy: [],
    });
    updated = true;
  });

  if (updated) {
    await group.save();
  }
};

const ensureCoreGroupsForUser = async (user) => {
  if (!user) return;

  for (const config of CORE_GROUPS) {
    let group = await TechGroup.findOne({ name: config.name });
    if (!group) {
      const groupId = generateId();
      group = new TechGroup({
        groupId,
        name: config.name,
        description: config.description,
        createdBy: 'system',
        members: [],
        topics: Array.isArray(config.topics) ? config.topics : [],
        type: 'community',
        messages: [],
      });
      await group.save();
      await seedGroupMessagesIfEmpty(group, config.seedMessages);
    } else {
      await seedGroupMessagesIfEmpty(group, config.seedMessages);
    }

    if (!group.members.includes(user.userId)) {
      group.members.push(user.userId);
      await group.save();
    }
  }
};

const SEED_ADMIN_ACCOUNTS = [
  {
    username: 'admin.codecircle',
    password: 'Admin@123',
    role: 'admin',
    email: 'admin@codecircle.io',
  },
  {
    username: 'superadmin.codecircle',
    password: 'SuperAdmin@123',
    role: 'superadmin',
    email: 'superadmin@codecircle.io',
  },
];

const ensureSeedAdmins = async () => {
  for (const account of SEED_ADMIN_ACCOUNTS) {
    try {
      const existing = await User.findOne({
        username: { $regex: new RegExp(`^${account.username}$`, 'i') },
      });

      if (!existing) {
        const user = new User({
          userId: generateId(),
          username: account.username,
          password: account.password,
          email: account.email,
          provider: 'local',
          role: account.role,
          onboardingCompleted: true,
          online: false,
          createdAt: new Date(),
          lastSeen: new Date(),
        });
        await user.save();
        await ensureCoreGroupsForUser(user);
        console.log(`👑 Seeded ${account.role} account: ${account.username}`);
      } else {
        let updated = false;
        if (existing.role !== account.role) {
          existing.role = account.role;
          updated = true;
        }
        if (existing.password !== account.password) {
          existing.password = account.password;
          updated = true;
        }
        if (!existing.email && account.email) {
          existing.email = account.email;
          updated = true;
        }
        if (!existing.onboardingCompleted) {
          existing.onboardingCompleted = true;
          updated = true;
        }
        if (updated) {
          await existing.save();
          console.log(`👑 Updated seeded admin account: ${account.username}`);
        }
        await ensureCoreGroupsForUser(existing);
      }
    } catch (error) {
      console.error(`Failed ensuring admin account ${account.username}:`, error);
    }
  }
};

const serializeUserSummary = (user, extras = {}) => ({
  userId: user.userId,
  username: user.username,
  online: user.online,
  lastSeen: user.lastSeen,
  ...extras,
});

const buildFriendPayload = async (userDoc) => {
  const friendIds = userDoc.friends || [];
  const incomingIds = userDoc.friendRequests || [];
  const outgoingIds = userDoc.sentFriendRequests || [];

  const [friendDocs, incomingDocs, outgoingDocs] = await Promise.all([
    friendIds.length
      ? User.find({ userId: { $in: friendIds } }).select('userId username online lastSeen')
      : [],
    incomingIds.length
      ? User.find({ userId: { $in: incomingIds } }).select('userId username online lastSeen')
      : [],
    outgoingIds.length
      ? User.find({ userId: { $in: outgoingIds } }).select('userId username online lastSeen')
      : [],
  ]);

  return {
    friends: friendDocs.map((doc) => serializeUserSummary(doc, { status: 'accepted' })),
    incomingRequests: incomingDocs.map((doc) =>
      serializeUserSummary(doc, { status: 'pending' })
    ),
    outgoingRequests: outgoingDocs.map((doc) =>
      serializeUserSummary(doc, { status: 'pending' })
    ),
  };
};

const findUserById = async (userId) => User.findOne({ userId });

const removeFromArray = (arr = [], value) => arr.filter((item) => item !== value);

const acceptFriendship = async (currentUser, targetUser) => {
  if (!currentUser.friends.includes(targetUser.userId)) {
    currentUser.friends.push(targetUser.userId);
  }
  if (!targetUser.friends.includes(currentUser.userId)) {
    targetUser.friends.push(currentUser.userId);
  }
};

const sendFriendRequestDocs = async ({ currentUser, targetUser, ioInstance }) => {
  if (currentUser.friends?.includes(targetUser.userId)) {
    return { error: 'You are already friends' };
  }

  if (currentUser.sentFriendRequests?.includes(targetUser.userId)) {
    return { error: 'Friend request already sent' };
  }

  // Auto accept if reciprocal request exists
  if (currentUser.friendRequests?.includes(targetUser.userId)) {
    currentUser.friendRequests = removeFromArray(
      currentUser.friendRequests,
      targetUser.userId
    );
    targetUser.sentFriendRequests = removeFromArray(
      targetUser.sentFriendRequests,
      currentUser.userId
    );
    await acceptFriendship(currentUser, targetUser);
    await Promise.all([currentUser.save(), targetUser.save()]);
    if (ioInstance) {
      const targetSocket = userSockets.get(targetUser.userId);
      if (targetSocket) {
        ioInstance.to(targetSocket).emit('friend:request:updated', {
          userId: currentUser.userId,
          username: currentUser.username,
          status: 'accepted',
        });
      }
    }
    const payload = await buildFriendPayload(currentUser);
    return { payload, autoAccepted: true };
  }

  currentUser.sentFriendRequests = Array.from(
    new Set([...(currentUser.sentFriendRequests || []), targetUser.userId])
  );
  targetUser.friendRequests = Array.from(
    new Set([...(targetUser.friendRequests || []), currentUser.userId])
  );
  await Promise.all([currentUser.save(), targetUser.save()]);
  if (ioInstance) {
    const targetSocket = userSockets.get(targetUser.userId);
    if (targetSocket) {
      ioInstance.to(targetSocket).emit('friend:request', {
        userId: currentUser.userId,
        username: currentUser.username,
      });
    }
  }
  const payload = await buildFriendPayload(currentUser);
  return { payload };
};

const respondToFriendRequestDocs = async ({
  currentUser,
  requester,
  action,
  ioInstance,
}) => {
  const normalizedAction = action.toLowerCase();
  if (!['accept', 'decline'].includes(normalizedAction)) {
    return { error: 'Invalid action' };
  }

  if (!currentUser.friendRequests?.includes(requester.userId)) {
    return { error: 'No pending friend request from this user' };
  }

  currentUser.friendRequests = removeFromArray(
    currentUser.friendRequests,
    requester.userId
  );
  requester.sentFriendRequests = removeFromArray(
    requester.sentFriendRequests,
    currentUser.userId
  );

  if (normalizedAction === 'accept') {
    await acceptFriendship(currentUser, requester);
  }

  await Promise.all([currentUser.save(), requester.save()]);

  if (ioInstance) {
    const requesterSocket = userSockets.get(requester.userId);
    if (requesterSocket) {
      ioInstance.to(requesterSocket).emit('friend:request:updated', {
        userId: currentUser.userId,
        username: currentUser.username,
        status: normalizedAction === 'accept' ? 'accepted' : 'declined',
      });
    }
  }

  const payload = await buildFriendPayload(currentUser);
  return { payload };
};

const serializeClassroomRequest = (request) => ({
  requestId: request.requestId,
  name: request.name,
  description: request.description,
  status: request.status,
  createdBy: request.createdBy,
  createdByUsername: request.createdByUsername,
  approvedBy: request.approvedBy,
  approvedByUsername: request.approvedByUsername,
  approvedAt: request.approvedAt,
  adminNotes: request.adminNotes,
  groupId: request.groupId,
  createdAt: request.createdAt,
  updatedAt: request.updatedAt,
});

const filterArchivedMessages = (messages = []) =>
  messages.filter((msg) => msg.isArchived).map(serializeMessageTimestamps);

const createAdminLog = async ({
  adminId,
  adminUsername,
  action,
  targetUserId,
  targetUsername,
  details = '',
}) => {
  try {
    const log = new AdminLog({
      logId: generateId(),
      adminId,
      adminUsername,
      action,
      targetUserId,
      targetUsername,
      details,
    });
    await log.save();
  } catch (error) {
    console.error('Failed to persist admin log:', error);
  }
};

const createSystemMessage = ({ groupId = null, text }) => ({
  messageId: new mongoose.Types.ObjectId().toString(),
  groupId,
  userId: 'system',
  username: 'system',
  message: text,
  attachments: [],
  voiceNote: null,
  timestamp: new Date(),
  reactions: {},
  readBy: [],
  isSystem: true,
});

const flagMessageViolation = async ({
  userId,
  username,
  messageId,
  groupId,
  chatId,
  offendingContent,
  triggerWord,
}) => {
  try {
    const violation = new Violation({
      violationId: generateId(),
      userId,
      username,
      messageId,
      groupId,
      chatId,
      offendingContent,
      triggerWord,
    });
    await violation.save();

    const user = await User.findOne({ userId });
    if (!user) {
      return { action: 'recorded' };
    }

    user.violationCount = (user.violationCount || 0) + 1;
    user.lastViolationAt = new Date();

    if (user.violationCount >= VIOLATION_LIMIT && user.status === 'active') {
      user.status = 'suspended';
      user.suspendedAt = new Date();
      await user.save();

      await createAdminLog({
        adminId: 'system',
        adminUsername: 'system',
        action: 'suspend',
        targetUserId: user.userId,
        targetUsername: user.username,
        details: `Auto-suspended after ${user.violationCount} violations.`,
      });

      return { action: 'suspended', user };
    }

    await user.save();
    return { action: 'warning', user };
  } catch (error) {
    console.error('Violation logging failed:', error);
    return { action: 'error' };
  }
};

const containsBannedWord = (text = '') => {
  if (!text) return null;
  const lowered = text.toLowerCase();
  return BANNED_WORDS.find((word) => word && lowered.includes(word));
};

const getChatId = (userId1, userId2) => {
  return [userId1, userId2].sort().join('-');
};

// OAuth Routes (only register if strategies are configured)
// These routes will only work if OAuth credentials are set in .env
app.get('/api/auth/google', (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(501).json({ error: 'Google OAuth is not configured' });
  }
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

app.get(
  '/api/auth/google/callback',
  (req, res, next) => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.status(501).json({ error: 'Google OAuth is not configured' });
    }
    passport.authenticate('google', { failureRedirect: '/api/auth/google/failure' })(req, res, next);
  },
  (req, res) => {
    // Successful authentication
    const user = req.user;
    // Redirect to frontend with user data in URL (in production, use proper token-based auth)
    const redirectUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/auth/callback?userId=${user.userId}&username=${encodeURIComponent(user.username)}&provider=google`;
    res.redirect(redirectUrl);
  }
);

app.get('/api/auth/google/failure', (req, res) => {
  res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/auth/callback?error=google_auth_failed`);
});

app.get('/api/auth/github', (req, res, next) => {
  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
    return res.status(501).json({ error: 'GitHub OAuth is not configured' });
  }
  passport.authenticate('github', { scope: ['user:email'] })(req, res, next);
});

app.get(
  '/api/auth/github/callback',
  (req, res, next) => {
    if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
      return res.status(501).json({ error: 'GitHub OAuth is not configured' });
    }
    passport.authenticate('github', { failureRedirect: '/api/auth/github/failure' })(req, res, next);
  },
  (req, res) => {
    // Successful authentication
    const user = req.user;
    // Redirect to frontend with user data in URL (in production, use proper token-based auth)
    const redirectUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/auth/callback?userId=${user.userId}&username=${encodeURIComponent(user.username)}&provider=github`;
    res.redirect(redirectUrl);
  }
);

app.get('/api/auth/github/failure', (req, res) => {
  res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/auth/callback?error=github_auth_failed`);
});

// REST API Routes
app.post('/api/register', async (req, res) => {
  try {
    // Check MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      console.error('⚠️ MongoDB not connected. Ready state:', mongoose.connection.readyState);
      return res.status(503).json({ 
        error: 'Database connection unavailable. Please try again in a moment.' 
      });
    }

    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Validate input
    if (username.trim().length < 2) {
      return res.status(400).json({ error: 'Username must be at least 2 characters long' });
    }

    if (password.length < 3) {
      return res.status(400).json({ error: 'Password must be at least 3 characters long' });
    }
    
    // Check if user exists (case-insensitive search)
    const existingUser = await User.findOne({ 
      username: { $regex: new RegExp(`^${username.trim()}$`, 'i') } 
    });
    
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    const userId = generateId();
    const user = new User({
      userId,
      username: username.trim(),
      password: password, // In production, hash this with bcrypt
      provider: 'local',
      online: false,
      createdAt: new Date(),
      lastSeen: new Date()
    });
    
    await user.save();
    console.log(`✅ User registered: ${username} (${userId})`);
    await ensureCoreGroupsForUser(user);
    const token = signToken(user);
    res.json({
      userId,
      username: user.username,
      role: user.role,
      token,
      onboardingCompleted: user.onboardingCompleted,
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: messages.join(', ') 
      });
    }
    
    // Handle duplicate key errors (unique constraint)
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ 
        error: `${field === 'username' ? 'Username' : 'User ID'} already exists` 
      });
    }
    
    // Handle MongoDB connection errors
    if (error.name === 'MongoServerError' || error.name === 'MongoNetworkError') {
      return res.status(503).json({ 
        error: 'Database connection error. Please try again.' 
      });
    }
    
    res.status(500).json({ 
      error: 'Registration failed', 
      details: error.message 
    });
  }
});

// Helper function for login logic (used by both endpoints)
const handleLoginLogic = async (identifier, password) => {
  if (!identifier || !password) {
    throw new Error('Username/email and password are required');
  }
  
  // Find user by username or email
  const user = await User.findOne({ 
    $or: [
      { username: identifier },
      { email: identifier }
    ]
  });
  
  if (!user) {
    throw new Error('Invalid credentials');
  }
  
  if (user.status === 'suspended') {
    throw new Error('Account suspended. Please contact support.');
  }

  if (user.status === 'deleted') {
    throw new Error('Account deleted. Please contact support.');
  }

  // Check if user has a password (OAuth users might not have one)
  if (!user.password) {
    throw new Error('Please sign in with your social account');
  }
  
  // Verify password (in production, use bcrypt.compare)
  if (user.password !== password) {
    throw new Error('Invalid credentials');
  }
  
  // Update online status
  user.online = true;
  user.lastSeen = new Date();
  await user.save();

  await ensureCoreGroupsForUser(user);

  const token = signToken(user);

  return {
    userId: user.userId,
    username: user.username,
    role: user.role,
    token,
    onboardingCompleted: user.onboardingCompleted,
  };
};

// New API endpoint (matches TypeScript server)
app.post('/api/auth/login', async (req, res) => {
  try {
    // Debug logging
    console.log('[API] /api/auth/login - Request body:', JSON.stringify(req.body));
    console.log('[API] /api/auth/login - Content-Type:', req.headers['content-type']);
    
    const { identifier, password } = req.body;
    
    // Check if body is empty or undefined
    if (!req.body || Object.keys(req.body).length === 0) {
      console.error('[API] /api/auth/login - Empty request body');
      return res.status(400).json({ error: 'Request body is required' });
    }
    
    if (!identifier || !password) {
      console.error('[API] /api/auth/login - Missing fields. Received:', { identifier: !!identifier, password: !!password });
      return res.status(400).json({ error: 'Identifier and password are required' });
    }
    
    const result = await handleLoginLogic(identifier, password);
    res.json(result);
  } catch (error) {
    console.error('[API] /api/auth/login - Error:', error.message);
    if (error.message === 'Invalid credentials') {
      return res.status(401).json({ error: error.message });
    }
    if (error.message.includes('suspended') || error.message.includes('deleted')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
});

// Legacy endpoint (for backward compatibility)
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    const result = await handleLoginLogic(username, password);
    res.json(result);
  } catch (error) {
    console.error('Login error:', error);
    if (error.message === 'Invalid credentials') {
      return res.status(401).json({ error: error.message });
    }
    if (error.message.includes('suspended') || error.message.includes('deleted')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const usersList = await User.find({}, { password: 0 }).select('userId username online lastSeen');
    res.json(usersList);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.get('/api/friends', authenticateJWT, async (req, res) => {
  try {
    const currentUser = await User.findOne({ userId: req.user.userId });
    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    const payload = await buildFriendPayload(currentUser);
    res.json(payload);
  } catch (error) {
    console.error('Fetch friends error:', error);
    res.status(500).json({ error: 'Unable to load friends right now.' });
  }
});

app.post('/api/onboarding/complete', authenticateJWT, async (req, res) => {
  try {
    const currentUser = await User.findOne({ userId: req.user.userId });
    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!currentUser.onboardingCompleted) {
      currentUser.onboardingCompleted = true;
      await currentUser.save();
      await ensureCoreGroupsForUser(currentUser);
    }

    res.json({ onboardingCompleted: true });
  } catch (error) {
    console.error('Onboarding completion error:', error);
    res.status(500).json({ error: 'Unable to update onboarding status right now.' });
  }
});

app.post('/api/friends/request', authenticateJWT, async (req, res) => {
  try {
    const { targetUsername } = req.body || {};
    if (!targetUsername || !targetUsername.trim()) {
      return res.status(400).json({ error: 'Target username is required' });
    }

    const normalized = targetUsername.trim();
    const targetUser = await User.findOne({
      username: { $regex: new RegExp(`^${normalized}$`, 'i') },
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (targetUser.userId === req.user.userId) {
      return res.status(400).json({ error: 'You cannot add yourself as a friend' });
    }

    const currentUser = await User.findOne({ userId: req.user.userId });
    if (!currentUser) {
      return res.status(404).json({ error: 'Current user not found' });
    }

    const { payload, error } = await sendFriendRequestDocs({
      currentUser,
      targetUser,
      ioInstance: io,
    });

    if (error) {
      return res.status(400).json({ error });
    }

    res.json(payload);
  } catch (error) {
    console.error('Send friend request error:', error);
    res.status(500).json({ error: 'Unable to send friend request right now.' });
  }
});

app.post('/api/friends/respond', authenticateJWT, async (req, res) => {
  try {
    const { requesterId, action } = req.body || {};
    if (!requesterId || !action) {
      return res.status(400).json({ error: 'Requester and action are required' });
    }

    const normalizedAction = action.toLowerCase();
    if (!['accept', 'decline'].includes(normalizedAction)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    const currentUser = await User.findOne({ userId: req.user.userId });
    const requester = await User.findOne({ userId: requesterId });

    if (!currentUser || !requester) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { payload, error } = await respondToFriendRequestDocs({
      currentUser,
      requester,
      action: normalizedAction,
      ioInstance: io,
    });

    if (error) {
      return res.status(400).json({ error });
    }

    res.json(payload);
  } catch (error) {
    console.error('Respond to friend request error:', error);
    res.status(500).json({ error: 'Unable to process friend request right now.' });
  }
});

app.post('/api/friends/add/:targetUserId', authenticateJWT, async (req, res) => {
  try {
    const { targetUserId } = req.params;
    if (!targetUserId) {
      return res.status(400).json({ error: 'Target user is required' });
    }

    const [currentUser, targetUser] = await Promise.all([
      findUserById(req.user.userId),
      findUserById(targetUserId),
    ]);

    if (!currentUser || !targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (targetUser.userId === currentUser.userId) {
      return res.status(400).json({ error: 'You cannot add yourself as a friend' });
    }

    const { payload, error } = await sendFriendRequestDocs({
      currentUser,
      targetUser,
      ioInstance: io,
    });

    if (error) {
      return res.status(400).json({ error });
    }

    res.json(payload);
  } catch (error) {
    console.error('Send friend request (by id) error:', error);
    res.status(500).json({ error: 'Unable to send friend request right now.' });
  }
});

app.post('/api/friends/accept/:requesterId', authenticateJWT, async (req, res) => {
  try {
    const { requesterId } = req.params;
    if (!requesterId) {
      return res.status(400).json({ error: 'Requester id is required' });
    }

    const [currentUser, requester] = await Promise.all([
      findUserById(req.user.userId),
      findUserById(requesterId),
    ]);

    if (!currentUser || !requester) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { payload, error } = await respondToFriendRequestDocs({
      currentUser,
      requester,
      action: 'accept',
      ioInstance: io,
    });

    if (error) {
      return res.status(400).json({ error });
    }

    res.json(payload);
  } catch (error) {
    console.error('Accept friend request error:', error);
    res.status(500).json({ error: 'Unable to accept friend request right now.' });
  }
});

app.delete('/api/friends/decline/:requesterId', authenticateJWT, async (req, res) => {
  try {
    const { requesterId } = req.params;
    if (!requesterId) {
      return res.status(400).json({ error: 'Requester id is required' });
    }

    const [currentUser, requester] = await Promise.all([
      findUserById(req.user.userId),
      findUserById(requesterId),
    ]);

    if (!currentUser || !requester) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { payload, error } = await respondToFriendRequestDocs({
      currentUser,
      requester,
      action: 'decline',
      ioInstance: io,
    });

    if (error) {
      return res.status(400).json({ error });
    }

    res.json(payload);
  } catch (error) {
    console.error('Decline friend request error:', error);
    res.status(500).json({ error: 'Unable to decline friend request right now.' });
  }
});

app.get('/api/friends/:userId', authenticateJWT, async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId || userId !== req.user.userId) {
      return res.status(403).json({ error: 'You can only view your own friends.' });
    }

    const currentUser = await findUserById(userId);
    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const payload = await buildFriendPayload(currentUser);
    res.json(payload);
  } catch (error) {
    console.error('List friends by id error:', error);
    res.status(500).json({ error: 'Unable to load friends right now.' });
  }
});

app.get('/api/classroom-requests', authenticateJWT, async (req, res) => {
  try {
    const requests = await ClassroomRequest.find({ createdBy: req.user.userId }).sort({
      createdAt: -1,
    });
    res.json(requests.map(serializeClassroomRequest));
  } catch (error) {
    console.error('Fetch classroom requests error:', error);
    res.status(500).json({ error: 'Unable to load classroom requests right now.' });
  }
});

app.post('/api/classroom-requests', authenticateJWT, async (req, res) => {
  try {
    const { name, description = '' } = req.body || {};
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: 'Session name must be at least 2 characters long' });
    }

    const normalizedName = name.trim();

    const activePending = await ClassroomRequest.countDocuments({
      createdBy: req.user.userId,
      status: 'pending',
    });
    if (activePending >= 3) {
      return res
        .status(400)
        .json({ error: 'You already have pending classroom requests awaiting review.' });
    }

    const request = new ClassroomRequest({
      requestId: generateId(),
      name: normalizedName,
      description: description?.trim() || '',
      createdBy: req.user.userId,
      createdByUsername: req.user.username,
    });
    await request.save();

    const payload = serializeClassroomRequest(request);
    io.emit('classroom:request:created', payload);

    res.status(201).json(payload);
  } catch (error) {
    console.error('Create classroom request error:', error);
    res.status(500).json({ error: 'Unable to submit classroom request right now.' });
  }
});

app.get('/api/admin/classroom-requests', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const requests = await ClassroomRequest.find({}).sort({ createdAt: -1 });
    res.json(requests.map(serializeClassroomRequest));
  } catch (error) {
    console.error('Admin fetch classroom requests error:', error);
    res.status(500).json({ error: 'Unable to load classroom requests.' });
  }
});

app.post(
  '/api/admin/classroom-requests/:requestId/approve',
  authenticateJWT,
  requireAdmin,
  async (req, res) => {
    try {
      const { requestId } = req.params;
      const request = await ClassroomRequest.findOne({ requestId });
      if (!request) {
        return res.status(404).json({ error: 'Request not found' });
      }
      if (request.status !== 'pending') {
        return res.status(400).json({ error: 'Request already processed' });
      }

      if (!request.createdBy) {
        return res.status(400).json({ error: 'Request creator is missing' });
      }

      const groupId = request.groupId || generateId();
      const members = Array.from(
        new Set(
          [request.createdBy, req.user.userId]
            .filter((id) => typeof id === 'string' && id)
            .map((id) => id.trim())
            .filter(Boolean)
        )
      );
      const admins = Array.from(
        new Set(
          [req.user.userId, request.createdBy]
            .filter((id) => typeof id === 'string' && id)
            .map((id) => id.trim())
            .filter(Boolean)
        )
      );

      if (!members.length) {
        throw new Error('No members were generated for the classroom group');
      }

      let classroomGroup = await TechGroup.findOne({ groupId });
      if (!classroomGroup) {
        classroomGroup = new TechGroup({
          groupId,
          name: request.name,
          description: request.description || 'Approved classroom session',
          createdBy: request.createdBy,
          type: 'classroom',
          topics: ['Classroom'],
          messages: [],
        });
      } else {
        classroomGroup.messages = Array.isArray(classroomGroup.messages)
          ? classroomGroup.messages.filter(
              (msg) =>
                msg &&
                typeof msg.messageId === 'string' &&
                msg.messageId.trim().length > 0
            )
          : [];
      }

      classroomGroup.name = request.name;
      classroomGroup.description = request.description || 'Approved classroom session';
      classroomGroup.type = 'classroom';
      classroomGroup.topics = Array.isArray(classroomGroup.topics)
        ? Array.from(new Set([...classroomGroup.topics, 'Classroom']))
        : ['Classroom'];
      classroomGroup.members = members;
      classroomGroup.admins = admins;
      const approvalMessage = createSystemMessage({
        groupId: classroomGroup.groupId,
        text: `Your classroom request for ${request.name} has been approved.`,
      });
      classroomGroup.messages.push(approvalMessage);
      await classroomGroup.save();

      request.status = 'approved';
      request.approvedBy = req.user.userId;
      request.approvedByUsername = req.user.username;
      request.approvedAt = new Date();
      request.groupId = classroomGroup.groupId;
      await request.save();

      const serializedGroup = serializeGroup(classroomGroup);
      io.emit('group:created', serializedGroup);

      const payload = {
        ...serializeClassroomRequest(request),
        systemMessage: approvalMessage,
      };
      io.emit('classroom:request:updated', payload);
      const requesterRoom = `user:${request.createdBy}`;
      io.to(requesterRoom).emit('classroomRequestUpdate', payload);

      const requesterSocket = userSockets.get(request.createdBy);
      if (requesterSocket) {
        io.to(requesterSocket).emit('classroomRequestUpdate', payload);
        io.to(requesterSocket).emit('classroom:request:approved', payload);
      }

      res.json(payload);
    } catch (error) {
      console.error('Approve classroom request error:', error);
      res.status(500).json({
        error: 'Unable to approve classroom request right now.',
        details: error?.message || null,
      });
    }
  }
);

app.post(
  '/api/admin/classroom-requests/:requestId/decline',
  authenticateJWT,
  requireAdmin,
  async (req, res) => {
    try {
      const { requestId } = req.params;
      const { adminNotes = '' } = req.body || {};
      const request = await ClassroomRequest.findOne({ requestId });
      if (!request) {
        return res.status(404).json({ error: 'Request not found' });
      }
      if (request.status !== 'pending') {
        return res.status(400).json({ error: 'Request already processed' });
      }

      request.status = 'declined';
      request.approvedBy = req.user.userId;
      request.approvedByUsername = req.user.username;
      request.approvedAt = new Date();
      request.adminNotes = adminNotes?.trim() || '';
      await request.save();

      const declineMessage = createSystemMessage({
        text: `Your classroom request for ${request.name} has been declined.`,
      });

      const payload = {
        ...serializeClassroomRequest(request),
        systemMessage: declineMessage,
      };
      io.emit('classroom:request:updated', payload);
      const requesterRoom = `user:${request.createdBy}`;
      io.to(requesterRoom).emit('classroomRequestUpdate', payload);

      const requesterSocket = userSockets.get(request.createdBy);
      if (requesterSocket) {
        io.to(requesterSocket).emit('classroomRequestUpdate', payload);
        io.to(requesterSocket).emit('classroom:request:declined', payload);
      }

      res.json(payload);
    } catch (error) {
      console.error('Decline classroom request error:', error);
      res.status(500).json({ error: 'Unable to decline classroom request right now.' });
    }
  }
);

const serializeGroup = (group) => ({
  groupId: group.groupId,
  name: group.name,
  description: group.description || '',
  type: group.type || 'community',
  createdBy: group.createdBy,
  memberCount: group.members.length,
  members: group.members,
  admins: group.admins || [],
  pendingJoinCount: Array.isArray(group.joinRequests)
    ? group.joinRequests.filter((req) => req.status === 'pending').length
    : 0,
  topics: group.topics || [],
  createdAt: group.createdAt,
  updatedAt: group.updatedAt,
});

const isGroupAdmin = (group, userId) =>
  Array.isArray(group.admins) && group.admins.includes(userId);

const serializeJoinRequest = (request) => ({
  requestId: request.requestId,
  userId: request.userId,
  username: request.username,
  answers: request.answers || {},
  level: request.level || '',
  status: request.status,
  createdAt: request.createdAt,
  updatedAt: request.updatedAt,
  decidedAt: request.decidedAt,
  decidedBy: request.decidedBy,
});

app.get('/api/tech-groups', async (req, res) => {
  try {
    const { search } = req.query;
    const query = search
      ? { name: { $regex: new RegExp(search.trim(), 'i') } }
      : {};

    const groups = await TechGroup.find(query).sort({ createdAt: -1 });
    res.json(groups.map(serializeGroup));
  } catch (error) {
    console.error('Get tech groups error:', error);
    res.status(500).json({ error: 'Failed to fetch tech groups' });
  }
});

app.post('/api/tech-groups', async (req, res) => {
  try {
    const { name, createdBy, description = '', topics = [], type = 'community' } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: 'Tech group name must be at least 2 characters long' });
    }

    if (!createdBy) {
      return res.status(400).json({ error: 'A creator is required to establish a tech group' });
    }

    const groupId = generateId();
    const group = new TechGroup({
      groupId,
      name: name.trim(),
      description: description.trim(),
      createdBy,
      members: [createdBy],
      admins: [createdBy],
      topics: Array.isArray(topics) ? topics : [],
      type: type === 'classroom' ? 'classroom' : 'community',
    });

    await group.save();
    const serialized = serializeGroup(group);

    const ioInstance = req.app.get('io');
    if (ioInstance) {
      ioInstance.emit('group:created', serialized);
    }

    res.status(201).json(serialized);
  } catch (error) {
    console.error('Create tech group error:', error);
    res.status(500).json({ error: 'Failed to create tech group' });
  }
});

app.post('/api/tech-groups/:groupId/join-requests', authenticateJWT, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { answers = {}, level = '' } = req.body || {};

    const group = await TechGroup.findOne({ groupId });
    if (!group) {
      return res.status(404).json({ error: 'Tech group not found' });
    }

    if (!Array.isArray(group.joinRequests)) {
      group.joinRequests = [];
    }

    let request = group.joinRequests.find((item) => item.userId === req.user.userId);
    if (!request) {
      request = {
        requestId: generateId(),
        userId: req.user.userId,
        username: req.user.username,
        answers,
        level,
        status: 'approved',
        createdAt: new Date(),
        updatedAt: new Date(),
        decidedAt: new Date(),
        decidedBy: 'system',
      };
      group.joinRequests.push(request);
    } else {
      request.answers = answers;
      request.level = level;
      request.updatedAt = new Date();
      request.status = 'approved';
      request.decidedAt = new Date();
      request.decidedBy = 'system';
      request.username = req.user.username;
    }

    if (!group.members.includes(req.user.userId)) {
      group.members.push(req.user.userId);
    }

    if (!Array.isArray(group.messages)) {
      group.messages = [];
    }
    group.messages.push({
      messageId: generateId(),
      groupId,
      userId: 'system',
      username: 'Announcements',
      message: `🎉 **${req.user.username}** just joined ${group.name}. Make them feel welcome!`,
      attachments: [],
      voiceNote: null,
      timestamp: new Date(),
      reactions: {},
      readBy: [],
    });

    await group.save();

    const ioInstance = req.app.get('io');
    if (ioInstance) {
      ioInstance.to(`group:${groupId}`).emit('group:joined', {
        groupId,
        userId: req.user.userId,
      });
      const targetSocketId = userSockets.get(req.user.userId);
      if (targetSocketId) {
        ioInstance.to(targetSocketId).emit('group:join:decision', {
          groupId,
          status: 'approved',
        });
      }
    }

    res.status(201).json({ status: 'approved', request: serializeJoinRequest(request) });
  } catch (error) {
    console.error('Create join request error:', error);
    res.status(500).json({ error: 'Unable to submit join request right now.' });
  }
});

app.get(
  '/api/tech-groups/:groupId/join-requests',
  authenticateJWT,
  async (req, res) => {
    try {
      const { groupId } = req.params;
      const group = await TechGroup.findOne({ groupId });
      if (!group) {
        return res.status(404).json({ error: 'Tech group not found' });
      }

      if (!isGroupAdmin(group, req.user.userId) && req.user.role !== 'superadmin') {
        return res.status(403).json({ error: 'Group admin access required' });
      }

      const requests = Array.isArray(group.joinRequests)
        ? group.joinRequests.map(serializeJoinRequest)
        : [];
      res.json(requests);
    } catch (error) {
      console.error('Fetch join requests error:', error);
      res.status(500).json({ error: 'Unable to load join requests right now.' });
    }
  }
);

app.post(
  '/api/tech-groups/:groupId/join-requests/:requestId/approve',
  authenticateJWT,
  async (req, res) => {
    try {
      const { groupId, requestId } = req.params;
      const group = await TechGroup.findOne({ groupId });
      if (!group) {
        return res.status(404).json({ error: 'Tech group not found' });
      }

      if (!isGroupAdmin(group, req.user.userId) && req.user.role !== 'superadmin') {
        return res.status(403).json({ error: 'Group admin access required' });
      }

      const request = Array.isArray(group.joinRequests)
        ? group.joinRequests.find((item) => item.requestId === requestId)
        : null;
      if (!request) {
        return res.status(404).json({ error: 'Join request not found' });
      }

      request.status = 'approved';
      request.decidedAt = new Date();
      request.decidedBy = req.user.userId;
      request.updatedAt = new Date();

      if (!group.members.includes(request.userId)) {
        group.members.push(request.userId);
      }

      if (!Array.isArray(group.messages)) {
        group.messages = [];
      }
      group.messages.push({
        messageId: generateId(),
        groupId,
        userId: 'system',
        username: 'Announcements',
        message: `🎉 **${request.username || 'A new member'}** has joined ${group.name}. Welcome aboard!`,
        attachments: [],
        voiceNote: null,
        timestamp: new Date(),
        reactions: {},
        readBy: [],
      });

      await group.save();

      const ioInstance = req.app.get('io');
      if (ioInstance) {
        ioInstance.to(`group:${groupId}`).emit('group:joined', {
          groupId,
          userId: request.userId,
        });
        const targetSocketId = userSockets.get(request.userId);
        if (targetSocketId) {
          ioInstance.to(targetSocketId).emit('group:join:decision', {
            groupId,
            status: 'approved',
          });
        }
      }

      res.json({ request: serializeJoinRequest(request) });
    } catch (error) {
      console.error('Approve join request error:', error);
      res.status(500).json({ error: 'Unable to approve join request right now.' });
    }
  }
);

app.post(
  '/api/tech-groups/:groupId/join-requests/:requestId/decline',
  authenticateJWT,
  async (req, res) => {
    try {
      const { groupId, requestId } = req.params;
      const group = await TechGroup.findOne({ groupId });
      if (!group) {
        return res.status(404).json({ error: 'Tech group not found' });
      }

      if (!isGroupAdmin(group, req.user.userId) && req.user.role !== 'superadmin') {
        return res.status(403).json({ error: 'Group admin access required' });
      }

      const request = Array.isArray(group.joinRequests)
        ? group.joinRequests.find((item) => item.requestId === requestId)
        : null;
      if (!request) {
        return res.status(404).json({ error: 'Join request not found' });
      }

      request.status = 'declined';
      request.decidedAt = new Date();
      request.decidedBy = req.user.userId;
      request.updatedAt = new Date();

      await group.save();

      const ioInstance = req.app.get('io');
      if (ioInstance) {
        const targetSocketId = userSockets.get(request.userId);
        if (targetSocketId) {
          ioInstance.to(targetSocketId).emit('group:join:decision', {
            groupId,
            status: 'declined',
          });
        }
      }

      res.json({ request: serializeJoinRequest(request) });
    } catch (error) {
      console.error('Decline join request error:', error);
      res.status(500).json({ error: 'Unable to decline join request right now.' });
    }
  }
);

app.get('/api/tech-groups/:groupId/messages/archived', async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await TechGroup.findOne({ groupId });
    if (!group) {
      return res.status(404).json({ error: 'Tech group not found' });
    }

    await autoArchiveTechGroupMessages(group);
    return res.json(filterArchivedMessages(group.messages));
  } catch (error) {
    console.error('Get archived tech group messages error:', error);
    return res.status(500).json({ error: 'Failed to fetch archived messages' });
  }
});

app.post('/api/tech-groups/:groupId/messages/:messageId/archive', async (req, res) => {
  try {
    const { groupId, messageId } = req.params;
    const group = await TechGroup.findOne({ groupId });
    if (!group) {
      return res.status(404).json({ error: 'Tech group not found' });
    }

    const targetMessage = group.messages.find((msg) => msg.messageId === messageId);
    if (!targetMessage) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (!targetMessage.isArchived) {
      targetMessage.isArchived = true;
      targetMessage.archivedAt = new Date();
      await group.save();
      const ioInstance = req.app.get('io');
      if (ioInstance) {
        ioInstance.to(`group:${groupId}`).emit('group:message:archived', { groupId, messageId });
      }
    }

    return res.json({
      messageId: targetMessage.messageId,
      archivedAt: targetMessage.archivedAt,
      isArchived: targetMessage.isArchived,
    });
  } catch (error) {
    console.error('Archive tech group message error:', error);
    return res.status(500).json({ error: 'Failed to archive message' });
  }
});

app.get('/api/tech-groups/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await TechGroup.findOne({ groupId });
    if (!group) {
      return res.status(404).json({ error: 'Tech group not found' });
    }
    res.json(serializeGroup(group));
  } catch (error) {
    console.error('Get tech group error:', error);
    res.status(500).json({ error: 'Failed to fetch tech group' });
  }
});

app.patch('/api/tech-groups/:groupId', authenticateJWT, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name, description, topics } = req.body;

    const group = await TechGroup.findOne({ groupId });
    if (!group) {
      return res.status(404).json({ error: 'Tech group not found' });
    }

    const isCreator = group.createdBy === req.user.userId;
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
    if (!isCreator && !isAdmin) {
      return res
        .status(403)
        .json({ error: 'Only the circle creator or an admin can update this circle.' });
    }

    if (name) {
      if (name.trim().length < 2) {
        return res.status(400).json({ error: 'Tech group name must be at least 2 characters long' });
      }
      group.name = name.trim();
    }

    if (typeof description === 'string') {
      group.description = description.trim();
    }

    if (Array.isArray(topics)) {
      group.topics = topics;
    }

    await group.save();
    res.json(serializeGroup(group));
  } catch (error) {
    console.error('Update tech group error:', error);
    res.status(500).json({ error: 'Failed to update tech group' });
  }
});

app.delete('/api/tech-groups/:groupId', authenticateJWT, async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await TechGroup.findOne({ groupId });
    if (!group) {
      return res.status(404).json({ error: 'Tech group not found' });
    }

    const isCreator = group.createdBy === req.user.userId;
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
    if (!isCreator && !isAdmin) {
      return res
        .status(403)
        .json({ error: 'Only the circle creator or an admin can delete this circle.' });
    }

    const deletion = await TechGroup.findOneAndDelete({ groupId });
    if (!deletion) {
      return res.status(404).json({ error: 'Tech group not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Delete tech group error:', error);
    res.status(500).json({ error: 'Failed to delete tech group' });
  }
});

app.get('/api/admin/users', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const users = await User.find({}, { password: 0 }).sort({ createdAt: -1 });
    res.json(
      users.map((user) => ({
        userId: user.userId,
        username: user.username,
        role: user.role,
        status: user.status,
        online: user.online,
        lastSeen: user.lastSeen,
        createdAt: user.createdAt,
        suspendedAt: user.suspendedAt,
        deletedAt: user.deletedAt,
      }))
    );
  } catch (error) {
    console.error('Admin fetch users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.post(
  '/api/admin/users/:userId/suspend',
  authenticateJWT,
  requireAdmin,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { reason = '' } = req.body || {};

      const targetUser = await User.findOne({ userId });
      if (!targetUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (targetUser.role === 'admin') {
        return res.status(400).json({ error: 'Cannot suspend another admin' });
      }

      if (targetUser.status === 'deleted') {
        return res.status(400).json({ error: 'User already deleted' });
      }

      targetUser.status = 'suspended';
      targetUser.suspendedAt = new Date();
      targetUser.online = false;
      await targetUser.save();

      await createAdminLog({
        adminId: req.user.userId,
        adminUsername: req.currentUser?.username || req.user.username || 'admin',
        action: 'suspend',
        targetUserId: targetUser.userId,
        targetUsername: targetUser.username,
        details: reason,
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Admin suspend user error:', error);
      res.status(500).json({ error: 'Failed to suspend user' });
    }
  }
);

app.post(
  '/api/admin/users/:userId/reinstate',
  authenticateJWT,
  requireAdmin,
  async (req, res) => {
    try {
      const { userId } = req.params;

      const targetUser = await User.findOne({ userId });
      if (!targetUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (targetUser.status === 'deleted') {
        return res.status(400).json({ error: 'Cannot reinstate a deleted user' });
      }

      targetUser.status = 'active';
      targetUser.suspendedAt = null;
      await targetUser.save();

      await createAdminLog({
        adminId: req.user.userId,
        adminUsername: req.currentUser?.username || req.user.username || 'admin',
        action: 'reinstate',
        targetUserId: targetUser.userId,
        targetUsername: targetUser.username,
        details: '',
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Admin reinstate user error:', error);
      res.status(500).json({ error: 'Failed to reinstate user' });
    }
  }
);

app.delete(
  '/api/admin/users/:userId',
  authenticateJWT,
  requireAdmin,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const targetUser = await User.findOne({ userId });
      if (!targetUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (targetUser.role === 'admin') {
        return res.status(400).json({ error: 'Cannot delete another admin' });
      }

      await User.deleteOne({ userId });

      await createAdminLog({
        adminId: req.user.userId,
        adminUsername: req.currentUser?.username || req.user.username || 'admin',
        action: 'delete',
        targetUserId: targetUser.userId,
        targetUsername: targetUser.username,
        details: '',
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Admin delete user error:', error);
      res.status(500).json({ error: 'Failed to delete user' });
    }
  }
);

app.post(
  '/api/admin/users/:userId/role',
  authenticateJWT,
  requireAdmin,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { role } = req.body || {};

      const allowedRoles = ['user', 'admin', 'superadmin'];
      if (!role || !allowedRoles.includes(role)) {
        return res.status(400).json({ error: 'Invalid role specified.' });
      }

      if (role === 'superadmin' && req.user.role !== 'superadmin') {
        return res.status(403).json({ error: 'Only a superadmin can assign superadmin privileges.' });
      }

      const targetUser = await User.findOne({ userId });
      if (!targetUser) {
        return res.status(404).json({ error: 'User not found.' });
      }

      if (targetUser.role === 'superadmin' && req.user.role !== 'superadmin') {
        return res
          .status(403)
          .json({ error: 'Only a superadmin can modify another superadmin.' });
      }

      if (targetUser.role === 'superadmin' && role !== 'superadmin') {
        const superAdminCount = await User.countDocuments({ role: 'superadmin' });
        if (superAdminCount <= 1) {
          return res.status(400).json({ error: 'Cannot remove the last superadmin.' });
        }
      }

      if (targetUser.role === role) {
        return res.json({
          success: true,
          user: {
            userId: targetUser.userId,
            username: targetUser.username,
            role: targetUser.role,
            status: targetUser.status,
            lastSeen: targetUser.lastSeen,
          },
        });
      }

      targetUser.role = role;
      await targetUser.save();

      await createAdminLog({
        adminId: req.user.userId,
        adminUsername: req.currentUser?.username || req.user.username || 'admin',
        action: 'role-update',
        targetUserId: targetUser.userId,
        targetUsername: targetUser.username,
        details: `Role updated to ${role}`,
      });

      res.json({
        success: true,
        user: {
          userId: targetUser.userId,
          username: targetUser.username,
          role: targetUser.role,
          status: targetUser.status,
          lastSeen: targetUser.lastSeen,
        },
      });
    } catch (error) {
      console.error('Admin update role error:', error);
      res.status(500).json({ error: 'Failed to update user role.' });
    }
  }
);

app.get('/api/admin/logs', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
    const logs = await AdminLog.find({})
      .sort({ createdAt: -1 })
      .limit(limit);
    res.json(
      logs.map((log) => ({
        logId: log.logId,
        adminId: log.adminId,
        adminUsername: log.adminUsername,
        action: log.action,
        targetUserId: log.targetUserId,
        targetUsername: log.targetUsername,
        details: log.details,
        createdAt: log.createdAt,
      }))
    );
  } catch (error) {
    console.error('Admin fetch logs error:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

app.get('/api/admin/violations', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
    const violations = await Violation.find({})
      .sort({ createdAt: -1 })
      .limit(limit);
    res.json(
      violations.map((violation) => ({
        violationId: violation.violationId,
        userId: violation.userId,
        username: violation.username,
        messageId: violation.messageId,
        groupId: violation.groupId,
        chatId: violation.chatId,
        offendingContent: violation.offendingContent,
        triggerWord: violation.triggerWord,
        status: violation.status,
        createdAt: violation.createdAt,
      }))
    );
  } catch (error) {
    console.error('Admin fetch violations error:', error);
    res.status(500).json({ error: 'Failed to fetch violations' });
  }
});

app.post('/api/tech-groups/:groupId/members', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required to join a tech group' });
    }

    const group = await TechGroup.findOne({ groupId });
    if (!group) {
      return res.status(404).json({ error: 'Tech group not found' });
    }

    let joined = false;
    if (!group.members.includes(userId)) {
      group.members.push(userId);
      await group.save();
      joined = true;
    }

    const serialized = serializeGroup(group);

    const ioInstance = req.app.get('io');
    if (ioInstance && joined) {
      ioInstance.to(`group:${groupId}`).emit('group:joined', { groupId, userId });
    }

    res.status(200).json(serialized);
  } catch (error) {
    console.error('Join tech group error:', error);
    res.status(500).json({ error: 'Failed to join tech group' });
  }
});

app.delete('/api/tech-groups/:groupId/members/:userId', authenticateJWT, async (req, res) => {
  try {
    const { groupId, userId } = req.params;
    const group = await TechGroup.findOne({ groupId });
    if (!group) {
      return res.status(404).json({ error: 'Tech group not found' });
    }

    const isSelf = req.user.userId === userId;
    const isCreator = group.createdBy === req.user.userId;
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
    if (!isSelf && !isCreator && !isAdmin) {
      return res
        .status(403)
        .json({ error: 'You do not have permission to remove this member from the circle.' });
    }

    group.members = group.members.filter((memberId) => memberId !== userId);
    await group.save();

    const ioInstance = req.app.get('io');
    if (ioInstance) {
      ioInstance.to(`group:${groupId}`).emit('group:left', { groupId, userId });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Leave tech group error:', error);
    res.status(500).json({ error: 'Failed to leave tech group' });
  }
});

app.post('/api/uploads', async (req, res) => {
  try {
    const { fileName, contentType, data, scope = 'attachments' } = req.body || {};
    if (!fileName || !data) {
      return res.status(400).json({ error: 'File name and data are required' });
    }

    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const extension = safeName.includes('.') ? safeName.substring(safeName.lastIndexOf('.')) : '';
    const folderName = scope === 'voice' ? 'voice' : 'files';
    const destinationDir = join(uploadsDir, folderName);
    await fs.mkdir(destinationDir, { recursive: true });

    const buffer = Buffer.from(data, 'base64');
    const storedName = `${Date.now()}-${generateId().slice(0, 8)}${extension}`;
    const filePath = join(destinationDir, storedName);
    await fs.writeFile(filePath, buffer);

    res.json({
      url: `/uploads/${folderName}/${storedName}`,
      name: safeName,
      type: contentType || 'application/octet-stream',
      size: buffer.length,
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: 'Unable to store uploaded file' });
  }
});

app.post('/api/translate', async (req, res) => {
  try {
    const { text, target } = req.body || {};
    if (!text || typeof text !== 'string' || !target) {
      return res.status(400).json({ error: 'Text and target language are required' });
    }

    const trimmed = text.trim();
    if (!trimmed) {
      return res.status(400).json({ error: 'Text cannot be empty' });
    }

    if (trimmed.length > 4000) {
      return res.status(413).json({ error: 'Text is too long to translate' });
    }

    const result = await translate(trimmed, { to: target });
    res.json({
      translation: result?.text || '',
      detectedLanguage: result?.from?.language?.iso || 'auto',
    });
  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({ error: 'Unable to translate text right now.' });
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('user:join', async ({ userId, username }) => {
    try {
      userSockets.set(userId, socket.id);
      if (typeof userId === 'string' && userId.trim()) {
        socket.join(`user:${userId}`);
      }
      const user = await User.findOne({ userId });
      if (user) {
        await ensureCoreGroupsForUser(user);
        user.online = true;
        user.lastSeen = new Date();
        await user.save();
        
        // Join user's tech groups from database
        const userGroups = await TechGroup.find({ members: userId });
        userGroups.forEach(group => {
          socket.join(`group:${group.groupId}`);
        });
        
        // Broadcast user online status
        io.emit('user:status', { userId, online: true });
      }
    } catch (error) {
      console.error('User join error:', error);
    }
  });
  
  socket.on('group:join', async ({ groupId, userId }) => {
    try {
      const group = await TechGroup.findOne({ groupId });
      if (group) {
        if (!group.members.includes(userId)) {
          group.members.push(userId);
          await group.save();
        }
        socket.join(`group:${groupId}`);

        await autoArchiveTechGroupMessages(group);

        io.to(`group:${groupId}`).emit('group:joined', { groupId, userId });
        socket.emit('group:messages', filterActiveMessages(group.messages));
      }
    } catch (error) {
      console.error('Tech group join error:', error);
    }
  });

  socket.on('group:create', async ({ name, createdBy, description = '', topics = [] }) => {
    try {
      const groupId = generateId();
      const group = new TechGroup({
        groupId,
        name,
        createdBy,
        description,
        members: [createdBy],
        topics: Array.isArray(topics) ? topics : [],
        messages: [],
        type: 'community',
      });

      await group.save();
      socket.join(`group:${groupId}`);
      io.emit('group:created', serializeGroup(group));
    } catch (error) {
      console.error('Tech group create error:', error);
    }
  });
  
  socket.on('group:message', async ({ groupId, userId, username, message = '', attachments = [], voiceNote = null, messageId, timestamp, reactions = {} }) => {
    try {
      const group = await TechGroup.findOne({ groupId });
      if (group && group.members.includes(userId)) {
        const bannedWord = containsBannedWord(message || '');
        if (bannedWord) {
          await flagMessageViolation({
            userId,
            username,
            messageId,
            groupId,
            offendingContent: message,
            triggerWord: bannedWord,
          });
          return;
        }

        const sanitizedAttachments = Array.isArray(attachments)
          ? attachments.map((item) => ({
              url: item.url,
              name: item.name?.toString().slice(0, 120) || '',
              type: item.type?.toString().slice(0, 80) || 'application/octet-stream',
              size: Number.isFinite(item.size) ? item.size : 0,
            }))
          : [];

        const sanitizedVoiceNote = voiceNote && voiceNote.url
          ? {
              url: voiceNote.url,
              mimeType: voiceNote.mimeType?.toString().slice(0, 80) || 'audio/webm',
              duration: Number.isFinite(voiceNote.duration) ? voiceNote.duration : 0,
              waveform: Array.isArray(voiceNote.waveform)
                ? voiceNote.waveform.slice(0, 64).map((value) => Number(value) || 0)
                : [],
            }
          : null;

        const messageData = {
          messageId: messageId || generateId(),
          groupId,
          userId,
          username,
          message,
          attachments: sanitizedAttachments,
          voiceNote: sanitizedVoiceNote,
          timestamp: timestamp || new Date(),
          reactions,
          readBy: [userId]
        };
        
        group.messages.push(messageData);
        await group.save();
        
        io.to(`group:${groupId}`).emit('group:message', {
          ...messageData,
          timestamp: messageData.timestamp.toISOString()
        });
      }
    } catch (error) {
      console.error('Tech group message error:', error);
    }
  });
  
  socket.on('private:start', async ({ userId, targetUserId }) => {
    try {
      const chatId = getChatId(userId, targetUserId);
      
      let chat = await PrivateChat.findOne({ chatId });
      if (!chat) {
        chat = new PrivateChat({
          chatId,
          participants: [userId, targetUserId],
          messages: []
        });
        await chat.save();
      }
      
      await autoArchivePrivateChatMessages(chat);

      socket.emit('private:messages', filterActiveMessages(chat.messages));
    } catch (error) {
      console.error('Private chat start error:', error);
    }
  });
  
  socket.on('private:message', async ({ userId, targetUserId, message = '', attachments = [], voiceNote = null, username, messageId, timestamp, reactions = {} }) => {
    try {
      const chatId = getChatId(userId, targetUserId);
      
      let chat = await PrivateChat.findOne({ chatId });
      if (!chat) {
        chat = new PrivateChat({
          chatId,
          participants: [userId, targetUserId],
          messages: []
        });
      }
      
      const sanitizedAttachments = Array.isArray(attachments)
        ? attachments.map((item) => ({
            url: item.url,
            name: item.name?.toString().slice(0, 120) || '',
            type: item.type?.toString().slice(0, 80) || 'application/octet-stream',
            size: Number.isFinite(item.size) ? item.size : 0,
          }))
        : [];

      const sanitizedVoiceNote = voiceNote && voiceNote.url
        ? {
            url: voiceNote.url,
            mimeType: voiceNote.mimeType?.toString().slice(0, 80) || 'audio/webm',
            duration: Number.isFinite(voiceNote.duration) ? voiceNote.duration : 0,
            waveform: Array.isArray(voiceNote.waveform)
              ? voiceNote.waveform.slice(0, 64).map((value) => Number(value) || 0)
              : [],
          }
        : null;
      
      const messageData = {
        messageId: messageId || generateId(),
        chatId,
        userId,
        username,
        message,
        attachments: sanitizedAttachments,
        voiceNote: sanitizedVoiceNote,
        timestamp: timestamp || new Date(),
        reactions,
        readBy: [userId]
      };
      
      const bannedWord = containsBannedWord(messageData.message || '');
      if (bannedWord) {
        await flagMessageViolation({
          userId,
          username,
          messageId: messageData.messageId,
          chatId,
          offendingContent: messageData.message,
          triggerWord: bannedWord,
        });
        return;
      }

      chat.messages.push(messageData);
      chat.updatedAt = new Date();
      await chat.save();
      
      const messageResponse = {
        ...messageData,
        timestamp: messageData.timestamp.toISOString()
      };
      
      const targetSocketId = userSockets.get(targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('private:message', messageResponse);
      }
      socket.emit('private:message', messageResponse);
    } catch (error) {
      console.error('Private message error:', error);
    }
  });
  
  socket.on('typing:start', ({ groupId, userId, username, isPrivate, targetUserId }) => {
    if (isPrivate && targetUserId) {
      const targetSocketId = userSockets.get(targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('typing:start', { userId, username });
      }
    } else if (groupId) {
      socket.to(`group:${groupId}`).emit('typing:start', { userId, username });
    }
  });
  
  socket.on('typing:stop', ({ groupId, userId, isPrivate, targetUserId }) => {
    if (isPrivate && targetUserId) {
      const targetSocketId = userSockets.get(targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('typing:stop', { userId });
      }
    } else if (groupId) {
      socket.to(`group:${groupId}`).emit('typing:stop', { userId });
    }
  });
  
  socket.on('message:read', async ({ messageId, userId }) => {
    try {
      // Find message in rooms
      let group = await TechGroup.findOne({ 'messages.messageId': messageId });
      if (group) {
        const message = group.messages.find(m => m.messageId === messageId);
        if (message && !message.readBy.includes(userId)) {
          message.readBy.push(userId);
          await group.save();
          io.to(`group:${group.groupId}`).emit('message:read', { messageId, userId });
        }
        return;
      }
      
      // Find message in private chats
      let chat = await PrivateChat.findOne({ 'messages.messageId': messageId });
      if (chat) {
        const message = chat.messages.find(m => m.messageId === messageId);
        if (message && !message.readBy.includes(userId)) {
          message.readBy.push(userId);
          await chat.save();
          const otherUserId = chat.participants.find(id => id !== userId);
          if (otherUserId) {
            const targetSocketId = userSockets.get(otherUserId);
            if (targetSocketId) {
              io.to(targetSocketId).emit('message:read', { messageId, userId });
            }
          }
        }
      }
    } catch (error) {
      console.error('Message read error:', error);
    }
  });
  
  socket.on('message:react', async ({ messageId, userId, emoji }) => {
    try {
      // Find message in rooms
      let group = await TechGroup.findOne({ 'messages.messageId': messageId });
      if (group) {
        const message = group.messages.find(m => m.messageId === messageId);
        if (message) {
          if (!message.reactions) message.reactions = {};
          if (!message.reactions[emoji]) message.reactions[emoji] = [];
          if (!message.reactions[emoji].includes(userId)) {
            message.reactions[emoji].push(userId);
            await group.save();
            io.to(`group:${group.groupId}`).emit('message:react', { messageId, userId, emoji });
          }
        }
        return;
      }
      
      // Find message in private chats
      let chat = await PrivateChat.findOne({ 'messages.messageId': messageId });
      if (chat) {
        const message = chat.messages.find(m => m.messageId === messageId);
        if (message) {
          if (!message.reactions) message.reactions = {};
          if (!message.reactions[emoji]) message.reactions[emoji] = [];
          if (!message.reactions[emoji].includes(userId)) {
            message.reactions[emoji].push(userId);
            await chat.save();
            chat.participants.forEach(participantId => {
              const socketId = userSockets.get(participantId);
              if (socketId) {
                io.to(socketId).emit('message:react', { messageId, userId, emoji });
              }
            });
          }
        }
      }
    } catch (error) {
      console.error('Message react error:', error);
    }
  });
  
  socket.on('disconnect', async () => {
    console.log('User disconnected:', socket.id);
    
    // Find user by socket ID and mark offline
    for (const [userId, socketId] of userSockets.entries()) {
      if (socketId === socket.id) {
        userSockets.delete(userId);
        try {
          const user = await User.findOne({ userId });
          if (user) {
            user.online = false;
            user.lastSeen = new Date();
            await user.save();
            io.emit('user:status', { userId, online: false });
          }
        } catch (error) {
          console.error('Disconnect error:', error);
        }
        break;
      }
    }
  });
});

// Start HTTP server
// MongoDB connection is handled in database.js import above
const PORT = process.env.PORT || 5000;

// Function to start server
const startHTTPServer = () => {
  // Prevent multiple listeners
  if (httpServer.listening) {
    return;
  }
  
  httpServer.listen(PORT, () => {
    const publicUrl =
      process.env.RENDER_EXTERNAL_URL ||
      process.env.PUBLIC_BASE_URL ||
      (process.env.CLIENT_URL && process.env.CLIENT_URL.replace(/\/$/, '')) ||
      `http://localhost:${PORT}`;
    console.log(`\n🚀 Server running on port ${PORT}`);
    console.log(`📡 Socket.io server ready`);
    console.log(`🌐 API available at ${publicUrl}/api`);
    console.log(`\n✨ Server fully initialized and ready!\n`);
  });
};

// Wait for MongoDB to connect before starting server
mongoose.connection.once('connected', async () => {
  console.log(`\n📡 MongoDB ready, preparing indexes...`);
  await ensureIndexes();
  console.log('👑 Ensuring seeded admin accounts...');
  await ensureSeedAdmins();
  console.log('📦 Index preparation complete. Starting HTTP server...');
  startHTTPServer();
});

// If already connected (e.g., reconnection), start server immediately
if (mongoose.connection.readyState === 1) {
  ensureIndexes()
    .then(() => ensureSeedAdmins())
    .finally(() => startHTTPServer());
}

// Handle connection errors that prevent server start
mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err.message);
});

// Timeout fallback - start server even if DB connection is slow
// (Allows API to work, but some features may be unavailable)
setTimeout(() => {
  if (!httpServer.listening && mongoose.connection.readyState !== 0) {
    console.log('\n⚠️  Starting server (MongoDB connection in progress)...');
    startHTTPServer();
  }
}, 2000);

