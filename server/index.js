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
import bcrypt from 'bcryptjs';
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
import Friendship from './models/Friendship.js';
import PrivateConversation from './models/PrivateConversation.js';
import PrivateCircle from './models/PrivateCircle.js';
import TrainingRequest from './models/TrainingRequest.js';
import AdminLog from './models/AdminLog.js';
import Violation from './models/Violation.js';
import ClassroomRequest from './models/ClassroomRequest.js';
import LiveSessionApplication from './models/LiveSessionApplication.js';
import GroupAssessmentAttempt from './models/GroupAssessmentAttempt.js';
import AssessmentQuestion from './models/AssessmentQuestion.js';

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
  'codecircletech.netlify.app';
const allowedOrigins = rawOrigins
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);

// Always allow localhost origins for local development
const localhostOrigins = [
  'http://localhost:5173',  // Vite dev server
  'http://localhost:4173',  // Vite preview
  'http://localhost:3000',  // Common React dev port
  'http://localhost:5174',  // Alternative Vite port
  'http://127.0.0.1:5173',
  'http://127.0.0.1:4173',
  'http://127.0.0.1:3000',
];

// Combine environment origins with localhost origins
const allAllowedOrigins = [...new Set([...allowedOrigins, ...localhostOrigins])];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like Postman, mobile apps, or curl)
    if (!origin) {
      return callback(null, true);
    }
    const normalizedOrigin = origin.replace(/\/$/, '');
    
    // Check if origin is allowed (including localhost)
    if (allAllowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }
    
    // Also allow any localhost origin (for development flexibility)
    if (normalizedOrigin.startsWith('http://localhost:') || normalizedOrigin.startsWith('http://127.0.0.1:')) {
      console.log(`[CORS] Allowing localhost origin: ${normalizedOrigin}`);
      return callback(null, true);
    }
    
    // Log CORS rejection for debugging
    console.warn(`[CORS] Origin ${normalizedOrigin} not allowed. Allowed origins:`, allAllowedOrigins);
    return callback(new Error(`Origin ${normalizedOrigin} not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
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
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  allowEIO3: true
});

// Socket.IO connection error handling
io.engine.on('connection_error', (err) => {
  console.error('[Socket.IO] Connection error:', err);
  // Don't crash the server, just log it
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
    return sendError(res, 401, ERROR_CODES.UNAUTHORIZED, 'UNAUTHORIZED');
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const dbUser = await User.findOne({ userId: decoded.userId });
    if (!dbUser) {
      return sendError(res, 401, 'User account no longer exists', 'USER_NOT_FOUND');
    }
    if (dbUser.status === 'suspended') {
      return sendError(res, 403, ERROR_CODES.ACCOUNT_SUSPENDED, 'ACCOUNT_SUSPENDED');
    }
    if (dbUser.status === 'deleted') {
      return sendError(res, 403, ERROR_CODES.ACCOUNT_DELETED, 'ACCOUNT_DELETED');
    }
    req.user = {
      userId: dbUser.userId,
      role: dbUser.role,
      username: dbUser.username,
    };
    req.currentUser = dbUser;
    return next();
  } catch (error) {
    return sendError(res, 401, ERROR_CODES.INVALID_TOKEN, 'INVALID_TOKEN');
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'superadmin')) {
    return sendError(res, 403, ERROR_CODES.FORBIDDEN, 'ADMIN_REQUIRED');
  }
  return next();
};

const requireSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Superadmin access required' });
  }
  return next();
};

// Standardized error response helper
const sendError = (res, statusCode, message, code = null, field = null) => {
  const response = {
    success: false,
    message: message,
  };
  if (code) response.code = code;
  if (field) response.field = field;
  return res.status(statusCode).json(response);
};

// User-friendly error messages mapping
const ERROR_CODES = {
  INVALID_CREDENTIALS: 'Email or password is incorrect',
  INVALID_TOKEN: 'Your session has expired. Please sign in again',
  UNAUTHORIZED: 'You must be signed in to access this resource',
  FORBIDDEN: 'You do not have permission to perform this action',
  NOT_FOUND: 'The requested resource was not found',
  VALIDATION_ERROR: 'Please check your input and try again',
  DUPLICATE_ENTRY: 'This item already exists',
  SERVER_ERROR: 'Something went wrong. Please try again later',
  NETWORK_ERROR: 'Unable to connect to the server. Check your internet connection',
  ONBOARDING_REQUIRED: 'You must complete onboarding before continuing',
  ACCOUNT_SUSPENDED: 'Your account has been suspended',
  ACCOUNT_DELETED: 'This account has been deleted',
  WEAK_PASSWORD: 'Password must be at least 8 characters with uppercase, lowercase, and numbers',
  INVALID_EMAIL: 'Please enter a valid email address',
  USERNAME_TAKEN: 'This username is already taken',
  EMAIL_EXISTS: 'This email is already registered',
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
  if (!user) {
    console.warn('[ensureCoreGroupsForUser] No user provided');
    return;
  }

  // Check MongoDB connection
  if (mongoose.connection.readyState !== 1) {
    console.warn('[ensureCoreGroupsForUser] Database not connected, skipping group creation');
    return;
  }

  try {
    for (const config of CORE_GROUPS) {
      try {
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
          console.log(`[ensureCoreGroupsForUser] Created group: ${config.name}`);
          
          // Seed messages if provided - don't fail if this errors
          try {
            await seedGroupMessagesIfEmpty(group, config.seedMessages);
          } catch (seedError) {
            console.error(`[ensureCoreGroupsForUser] Error seeding messages for ${config.name}:`, seedError);
            // Continue - seeding is not critical
          }
        } else {
          // Seed messages if provided - don't fail if this errors
          try {
            await seedGroupMessagesIfEmpty(group, config.seedMessages);
          } catch (seedError) {
            console.error(`[ensureCoreGroupsForUser] Error seeding messages for ${config.name}:`, seedError);
            // Continue - seeding is not critical
          }
        }

        if (!group.members.includes(user.userId)) {
          group.members.push(user.userId);
          await group.save();
          console.log(`[ensureCoreGroupsForUser] Added user ${user.userId} to group ${config.name}`);
        }
      } catch (groupError) {
        console.error(`[ensureCoreGroupsForUser] Error processing group ${config.name}:`, groupError);
        // Continue with next group - don't fail entire function
      }
    }
  } catch (error) {
    console.error('[ensureCoreGroupsForUser] Fatal error:', error);
    // Don't throw - let caller handle gracefully
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
  _id: user.userId, // Map userId to _id for frontend compatibility
  userId: user.userId, // Keep userId for backend compatibility
  username: user.username,
  online: user.online,
  lastSeen: user.lastSeen,
  ...extras,
});

// Helper to build friend payload using Friendship model
const buildFriendPayload = async (userId) => {
  try {
    // Get accepted friendships (where user is requester or recipient)
    const acceptedFriendships = await Friendship.find({
      $or: [{ requesterId: userId }, { recipientId: userId }],
      status: 'accepted',
    }).lean();

    // Get pending friendships where user is recipient (incoming requests)
    const incomingFriendships = await Friendship.find({
      recipientId: userId,
      status: 'pending',
    }).lean();

    // Get pending friendships where user is requester (outgoing requests)
    const outgoingFriendships = await Friendship.find({
      requesterId: userId,
      status: 'pending',
    }).lean();

    // Extract friend user IDs
    const friendIds = acceptedFriendships.map((f) =>
      f.requesterId === userId ? f.recipientId : f.requesterId
    );
    const incomingIds = incomingFriendships.map((f) => f.requesterId);
    const outgoingIds = outgoingFriendships.map((f) => f.recipientId);

    // Fetch user documents
    const [friendDocs, incomingDocs, outgoingDocs] = await Promise.all([
      friendIds.length
        ? User.find({ userId: { $in: friendIds } }).select('userId username online lastSeen').lean()
        : [],
      incomingIds.length
        ? User.find({ userId: { $in: incomingIds } }).select('userId username online lastSeen').lean()
        : [],
      outgoingIds.length
        ? User.find({ userId: { $in: outgoingIds } }).select('userId username online lastSeen').lean()
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
  } catch (error) {
    console.error('[buildFriendPayload] Error:', error);
    return { friends: [], incomingRequests: [], outgoingRequests: [] };
  }
};

// Helper to create private conversation when friendship is accepted
const createPrivateConversation = async (requesterId, recipientId, friendshipId) => {
  try {
    // Sort IDs to ensure consistent conversationId
    const [userA, userB] = [requesterId, recipientId].sort();
    const conversationId = `friend-${userA}-${userB}`;

    // Check if conversation already exists
    let conversation = await PrivateConversation.findOne({ conversationId });
    if (conversation) {
      return conversation;
    }

    // Create new private conversation
    conversation = new PrivateConversation({
      conversationId,
      participants: [userA, userB],
      type: 'friend',
      friendshipId,
    });

    await conversation.save();
    console.log(`[createPrivateConversation] Created conversation ${conversationId} for friendship ${friendshipId}`);
    return conversation;
  } catch (error) {
    console.error('[createPrivateConversation] Error:', error);
    throw error;
  }
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

// Helper function to find tech group by slug (groupId or name) - normalized
const findTechGroupBySlug = async (slug) => {
  if (!slug || !slug.trim()) return null;
  const normalizedSlug = slug.toLowerCase().trim();
  
  // Try groupId first (exact match, case-insensitive)
  let group = await TechGroup.findOne({ 
    groupId: { $regex: new RegExp(`^${normalizedSlug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
  });
  if (group) {
    console.log(`[findTechGroupBySlug] Found by groupId: ${group.groupId}`);
    return group;
  }
  
  // Try by name (case-insensitive, partial match)
  group = await TechGroup.findOne({ 
    name: { $regex: new RegExp(normalizedSlug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }
  });
  if (group) {
    console.log(`[findTechGroupBySlug] Found by name: ${group.name}`);
    return group;
  }
  
  // Try creating slug from name and matching
  const allGroups = await TechGroup.find({}).lean();
  for (const g of allGroups) {
    const nameSlug = (g.name || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const groupIdSlug = (g.groupId || '').toLowerCase();
    if (nameSlug === normalizedSlug || groupIdSlug === normalizedSlug) {
      console.log(`[findTechGroupBySlug] Found by slug match: ${g.name} (${g.groupId})`);
      return await TechGroup.findOne({ groupId: g.groupId });
    }
  }
  
  console.warn(`[findTechGroupBySlug] No group found for slug: ${normalizedSlug}`);
  return null;
};

// Assessment questions data (skill-specific, comprehensive question bank)
// Each skill has at least 10+ questions across all levels
const ASSESSMENT_QUESTIONS = {
  'cybersecurity': {
    'Beginner': [
      { id: 'cybersecurity-beginner-1', question: 'What is the primary goal of cybersecurity?', options: ['To install hardware firewalls', 'To protect systems, networks, and data from attacks', 'To improve internet speed', 'To automate backups'] },
      { id: 'cybersecurity-beginner-2', question: 'Which of the following best describes phishing?', options: ['Testing network performance', 'Tricking users into revealing sensitive information', 'Encrypting files for secure storage', 'Scanning ports on a server'] },
      { id: 'cybersecurity-beginner-3', question: 'What does MFA stand for?', options: ['Multi-Factor Authentication', 'Managed Firewall Application', 'Malware Filtering Algorithm', 'Multi-File Archive'] },
      { id: 'cybersecurity-beginner-4', question: 'A strong password should include:', options: ['Only lowercase letters', 'Personal information', 'A mix of characters, numbers, and symbols', 'The word "password"'] },
      { id: 'cybersecurity-beginner-5', question: 'Which device often acts as the first line of defense on a network?', options: ['Router', 'Switch', 'Firewall', 'Printer'] },
      { id: 'cybersecurity-beginner-6', question: 'What is malware?', options: ['Authorized software updates', 'Malicious software designed to harm', 'Network monitoring tools', 'Encrypted traffic'] },
      { id: 'cybersecurity-beginner-7', question: 'Which of the following is a common sign of a phishing email?', options: ['Personalized greeting and correct domain', 'Unexpected attachments and urgent language', 'Delivered from a known contact', 'Contains company logo and signature'] },
      { id: 'cybersecurity-beginner-8', question: 'VPN helps protect your privacy by:', options: ['Blocking all ads', 'Creating an encrypted tunnel for data traffic', 'Duplicating your network', 'Deleting cookies automatically'] },
      { id: 'cybersecurity-beginner-9', question: 'Why are software updates important for security?', options: ['They increase screen brightness', 'They patch known vulnerabilities', 'They reduce internet usage', 'They remove all logs'] },
      { id: 'cybersecurity-beginner-10', question: 'Which type of malware locks data and demands payment?', options: ['Spyware', 'Ransomware', 'Adware', 'Botnet'] },
    ],
    'Intermediate': [
      { id: 'cybersecurity-intermediate-1', question: 'What does the CIA triad stand for in cybersecurity?', options: ['Confidentiality, Integrity, Availability', 'Control, Identification, Authentication', 'Compliance, Inspection, Analysis', 'Confidentiality, Investigation, Audit'] },
      { id: 'cybersecurity-intermediate-2', question: 'Which tool is commonly used for network intrusion detection?', options: ['Wireshark', 'Nmap', 'Snort', 'Burp Suite'] },
      { id: 'cybersecurity-intermediate-3', question: 'What is the purpose of a SIEM platform?', options: ['Coordinate remote teams', 'Aggregate and analyze security logs', 'Provide user training modules', 'Compress backup archives'] },
      { id: 'cybersecurity-intermediate-4', question: 'A zero-day vulnerability is best described as:', options: ['A vulnerability discovered on day zero of development', 'A vulnerability with a patch released', 'A previously unknown vulnerability without a fix', 'A vulnerability used only in theory'] },
      { id: 'cybersecurity-intermediate-5', question: 'What is lateral movement in an attack chain?', options: ['The initial exploitation of a network', 'Moving across systems to gain broader access', 'Deleting traces after an attack', 'Scanning external ports only'] },
      { id: 'cybersecurity-intermediate-6', question: 'Which encryption method uses one key for encryption and decryption?', options: ['Asymmetric encryption', 'Quantum encryption', 'Symmetric encryption', 'Homomorphic encryption'] },
      { id: 'cybersecurity-intermediate-7', question: 'What is the main function of a honeypot?', options: ['To accelerate traffic routing', 'To entice attackers and study their behavior', 'To encrypt database tables', 'To provide redundancy for servers'] },
      { id: 'cybersecurity-intermediate-8', question: 'Which framework helps align security controls with NIST guidance?', options: ['CIS Controls', 'ISO 9001', 'PMBOK', 'COBIT Lite'] },
      { id: 'cybersecurity-intermediate-9', question: 'What does EDR stand for?', options: ['Endpoint Detection and Response', 'Enterprise Data Repository', 'Encrypted Data Relay', 'External Defense Ring'] },
      { id: 'cybersecurity-intermediate-10', question: 'Which attack involves exploiting trust between two systems?', options: ['DDoS', 'Man-in-the-middle', 'Brute force', 'SQL Injection'] },
    ],
    'Professional': [
      { id: 'cybersecurity-professional-1', question: 'Which technique best supports threat hunting at scale?', options: ['Manual log review in each system', 'Automated behavior analytics with hypothesis-driven investigation', 'Random port blocking', 'Disabling user accounts weekly'] },
      { id: 'cybersecurity-professional-2', question: 'What is the MITRE ATT&CK framework used for?', options: ['Documenting software licenses', 'Cataloging adversary tactics and techniques', 'Monitoring physical security', 'Scheduling patch windows'] },
      { id: 'cybersecurity-professional-3', question: 'Which standard is most relevant for establishing an ISMS?', options: ['ISO 27001', 'SOC 2 Type I', 'PCI DSS', 'GDPR'] },
      { id: 'cybersecurity-professional-4', question: 'When leading an incident response, which phase comes after containment?', options: ['Preparation', 'Eradication and recovery', 'Lessons learned', 'Detection and analysis'] },
      { id: 'cybersecurity-professional-5', question: 'What is purple teaming?', options: ['A form of management training', 'Collaboration between red and blue teams to improve defenses', 'A compliance certification', 'A supply chain security initiative'] },
      { id: 'cybersecurity-professional-6', question: 'Which control best mitigates privilege escalation?', options: ['Open SSH access to all users', 'Enforcing least privilege with just-in-time access', 'Disabling MFA for admins', 'Sharing admin passwords verbally'] },
      { id: 'cybersecurity-professional-7', question: 'How does threat intelligence feed into SOC operations?', options: ['It replaces the need for monitoring tools', 'It provides context to enrich alerts and guide proactive defense', 'It is stored for audit purposes only', 'It is shared only with executives'] },
      { id: 'cybersecurity-professional-8', question: 'Which approach helps validate security posture against advanced threats?', options: ['Annual antivirus update', 'Ad-hoc penetration tests with no scope', 'Continuous red team exercises and breach simulations', 'Weekly password rotation reminders'] },
      { id: 'cybersecurity-professional-9', question: 'What is an effective way to manage third-party risk?', options: ['Rely on vendor statements alone', 'Implement a vendor risk management program with continuous monitoring', 'Disable vendor access completely', 'Sign NDAs without assessments'] },
      { id: 'cybersecurity-professional-10', question: 'Which metric best evaluates SOC efficiency?', options: ['Number of endpoints connected', 'Mean time to detect and respond (MTTD/MTTR)', 'Total internet bandwidth', 'Number of blocked ports'] },
    ],
  },
  'fullstack': {
    'Beginner': [
      { id: 'fullstack-beginner-1', question: 'What is the primary role of a full-stack developer?', options: ['Only frontend development', 'Only backend development', 'Both frontend and backend development', 'Database administration only'] },
      { id: 'fullstack-beginner-2', question: 'Which HTTP method is used to create new resources?', options: ['GET', 'POST', 'PUT', 'DELETE'] },
      { id: 'fullstack-beginner-3', question: 'What is REST?', options: ['A database type', 'An architectural style for web services', 'A programming language', 'A frontend framework'] },
      { id: 'fullstack-beginner-4', question: 'What does HTML provide in a web page?', options: ['Styling rules', 'Database queries', 'Structure and content', 'Server routing'] },
      { id: 'fullstack-beginner-5', question: 'Which language primarily styles web components?', options: ['Java', 'CSS', 'Python', 'SQL'] },
      { id: 'fullstack-beginner-6', question: 'What does API stand for?', options: ['Application Programming Interface', 'Automated Processing Index', 'Active Protocol Instance', 'Application Policy Integration'] },
      { id: 'fullstack-beginner-7', question: 'Which HTTP method is used to retrieve data?', options: ['GET', 'POST', 'DELETE', 'PATCH'] },
      { id: 'fullstack-beginner-8', question: 'What is a responsive layout?', options: ['A layout that adapts to various screen sizes', 'A layout that loads fastest', 'A layout for servers only', 'A layout without CSS'] },
      { id: 'fullstack-beginner-9', question: 'Which tool can bundle JavaScript modules?', options: ['Webpack', 'Git', 'Docker', 'Babel'] },
      { id: 'fullstack-beginner-10', question: 'What is a component in modern frontend frameworks?', options: ['A standalone piece of UI with behavior', 'A database table', 'A CSS class', 'A REST endpoint'] },
    ],
    'Intermediate': [
      { id: 'fullstack-intermediate-1', question: 'What does CORS enable in web applications?', options: ['Cross-origin resource sharing', 'Compression of response streams', 'Caching of static assets', 'Creation of server logs'] },
      { id: 'fullstack-intermediate-2', question: 'Which pattern helps manage global state in React?', options: ['Flux/Redux', 'MVC', 'Observer', 'Singleton'] },
      { id: 'fullstack-intermediate-3', question: 'What is server-side rendering (SSR)?', options: ['Rendering pages on the server before sending them to the client', 'Executing scripts on the client only', 'Rendering images as SVG', 'Encrypting client requests'] },
      { id: 'fullstack-intermediate-4', question: 'How do you secure REST endpoints?', options: ['Implement authentication, authorization, and input validation', 'Disable HTTPS', 'Use only GET requests', 'Open all ports'] },
      { id: 'fullstack-intermediate-5', question: 'Which database concept ensures data consistency across transactions?', options: ['ACID properties', 'CRUD', 'JSON schemas', 'Graph traversal'] },
      { id: 'fullstack-intermediate-6', question: 'What is containerization used for?', options: ['Packaging applications with dependencies into isolated environments', 'Designing UI components', 'Improving CSS animations', 'Documenting user stories'] },
      { id: 'fullstack-intermediate-7', question: 'Which tool manages infrastructure as code?', options: ['Terraform', 'Webpack', 'Sass', 'Redux Toolkit'] },
      { id: 'fullstack-intermediate-8', question: 'What does GraphQL provide compared to REST?', options: ['Flexible queries allowing clients to request specific data', 'Faster network speed', 'Automatic caching only', 'No need for backend'] },
      { id: 'fullstack-intermediate-9', question: 'Which practice ensures automated testing on every commit?', options: ['Continuous Integration', 'Waterfall', 'Code review', 'Branching'] },
      { id: 'fullstack-intermediate-10', question: 'What is a microservice architecture?', options: ['Collection of small services communicating over APIs', 'Single monolithic application', 'Frontend-only solution', 'Batch processing script'] },
    ],
    'Professional': [
      { id: 'fullstack-professional-1', question: 'Which strategy improves performance in large-scale React apps?', options: ['Using React Query or SWR for data caching and background updates', 'Writing inline styles only', 'Disabling memoization', 'Avoiding code splitting'] },
      { id: 'fullstack-professional-2', question: 'How can you ensure observability in distributed systems?', options: ['Implement tracing, metrics, and logs with correlation IDs', 'Rely on manual monitoring', 'Increase server hardware only', 'Disable logs in production'] },
      { id: 'fullstack-professional-3', question: 'What does blue-green deployment achieve?', options: ['Zero-downtime releases by switching traffic between environments', 'Automatic schema migration', 'Security hardening', 'User analytics'] },
      { id: 'fullstack-professional-4', question: 'Which practice improves API resilience?', options: ['Circuit breakers and retries with exponential backoff', 'Ignoring timeouts', 'Single region deployment', 'Executing all requests synchronously'] },
      { id: 'fullstack-professional-5', question: 'How do you manage secrets in production apps?', options: ['Use secret managers or vaults with role-based access', 'Store in plain text config', 'Commit to version control', 'Share via email'] },
      { id: 'fullstack-professional-6', question: 'What is domain-driven design (DDD) used for?', options: ['Model complex business domains through bounded contexts', 'Design UI mockups', 'Increase network bandwidth', 'Automate deployments'] },
      { id: 'fullstack-professional-7', question: 'Which approach helps scale databases horizontally?', options: ['Sharding and replication', 'Adding more CPU only', 'Using CSV files', 'Cron jobs'] },
      { id: 'fullstack-professional-8', question: 'How can you ensure accessibility in modern web apps?', options: ['Implement semantic HTML, ARIA labels, and automated accessibility tests', 'Disable keyboard navigation', 'Use images for all text', 'Rely on color only'] },
      { id: 'fullstack-professional-9', question: 'What is a reasonable strategy for performance budgets?', options: ['Define thresholds for metrics like LCP, FID, and bundle size', 'Increase bundle size gradually', 'Ignore mobile users', 'Disable caching'] },
      { id: 'fullstack-professional-10', question: 'Which tooling supports container orchestration at scale?', options: ['Kubernetes', 'Jenkins', 'Yarn', 'Sass'] },
    ],
  },
  'frontend': {
    'Beginner': [
      { id: 'frontend-beginner-1', question: 'What does HTML stand for?', options: ['HyperText Markup Language', 'High-level Text Management Language', 'HyperText Management Language', 'High-level Markup Language'] },
      { id: 'frontend-beginner-2', question: 'What is the purpose of CSS?', options: ['To create server-side logic', 'To style and layout web pages', 'To manage databases', 'To handle API requests'] },
      { id: 'frontend-beginner-3', question: 'What does CSS control on a web page?', options: ['Content structure', 'Server logic', 'Styling and layout', 'Database queries'] },
      { id: 'frontend-beginner-4', question: 'Which HTML element represents the largest heading?', options: ['<h1>', '<h6>', '<p>', '<header>'] },
      { id: 'frontend-beginner-5', question: 'What does responsive design ensure?', options: ['Web pages look good on different devices and screen sizes', 'Web pages only work on desktops', 'Pages load without images', 'All text is uppercase'] },
      { id: 'frontend-beginner-6', question: 'Which property creates space inside an element border?', options: ['Margin', 'Padding', 'Border', 'Display'] },
      { id: 'frontend-beginner-7', question: 'What is the purpose of alt text on images?', options: ['Improve SEO and accessibility', 'Increase font size', 'Change background color', 'Embed scripts'] },
      { id: 'frontend-beginner-8', question: 'Which unit is relative to the root font size?', options: ['rem', 'px', 'cm', 'vh'] },
      { id: 'frontend-beginner-9', question: 'What does flexbox help with?', options: ['Layout alignment and spacing', 'Database connections', 'Server routing', 'Audio playback'] },
      { id: 'frontend-beginner-10', question: 'Which tool inspects styles in the browser?', options: ['DevTools', 'Task Manager', 'Terminal', 'Paint'] },
    ],
    'Intermediate': [
      { id: 'frontend-intermediate-1', question: 'What is the main advantage of using a component library?', options: ['Consistency and faster UI development', 'Removing CSS entirely', 'Avoiding user input', 'Reducing HTML tags'] },
      { id: 'frontend-intermediate-2', question: 'Which hook manages state in React components?', options: ['useState', 'useMemo', 'useRef', 'useEffect'] },
      { id: 'frontend-intermediate-3', question: 'What does code splitting improve?', options: ['Initial load performance', 'CSS specificity', 'Database speed', 'Color contrast'] },
      { id: 'frontend-intermediate-4', question: 'How do you improve accessibility for custom controls?', options: ['Add ARIA roles and keyboard support', 'Hide from screen readers', 'Disable focus states', 'Use images for text'] },
      { id: 'frontend-intermediate-5', question: 'Which tool analyzes bundle size?', options: ['webpack-bundle-analyzer', 'ESLint', 'Prettier', 'Jest'] },
      { id: 'frontend-intermediate-6', question: 'What is hydration in SSR frameworks?', options: ['Attaching event listeners to server-rendered markup', 'Compressing CSS files', 'Rendering WebGL animations', 'Scheduling animation frames'] },
      { id: 'frontend-intermediate-7', question: 'Which API improves perceived performance during navigation?', options: ['Intersection Observer', 'Geolocation', 'Clipboard', 'WebRTC'] },
      { id: 'frontend-intermediate-8', question: 'What does CSS-in-JS provide?', options: ['Scoped styles and dynamic theming at runtime', 'Faster SQL queries', 'Static HTML generation', 'Automatic testing'] },
      { id: 'frontend-intermediate-9', question: 'How do you prevent layout shift for images?', options: ['Reserve space with width and height attributes', 'Load images last', 'Use inline styles only', 'Set overflow: hidden'] },
      { id: 'frontend-intermediate-10', question: 'What is the purpose of Storybook?', options: ['Develop and preview UI components in isolation', 'Run integration tests', 'Monitor network requests', 'Compile TypeScript'] },
    ],
    'Professional': [
      { id: 'frontend-professional-1', question: 'Which metric measures visual stability in Core Web Vitals?', options: ['CLS', 'LCP', 'FID', 'TTI'] },
      { id: 'frontend-professional-2', question: 'How can you implement design tokens effectively?', options: ['Centralize CSS variables mapped to semantic values', 'Copy styles into each component manually', 'Store styles in spreadsheets', 'Use inline styles exclusively'] },
      { id: 'frontend-professional-3', question: 'What approach enables themeable, reusable design systems?', options: ['Composable architecture with style primitives', 'Coupling components to pages', 'Avoiding documentation', 'Using only static designs'] },
      { id: 'frontend-professional-4', question: 'Which tool audits performance and accessibility automatically?', options: ['Lighthouse CI', 'Git Hooks', 'Mocha', 'Swagger'] },
      { id: 'frontend-professional-5', question: 'How do you optimize large lists in React?', options: ['Windowing/virtualization with libraries like react-window', 'Render all items at once', 'Disable keys on list items', 'Use tables for everything'] },
      { id: 'frontend-professional-6', question: 'What is an effective pattern for managing design handoff?', options: ['Shared Figma libraries synced with coded components', 'Emailing screenshots', 'Documenting in PDFs only', 'Having no feedback loop'] },
      { id: 'frontend-professional-7', question: 'How can you enforce accessible color contrast?', options: ['Automated linting and visual regression tests', 'Manually adjusting each page monthly', 'Removing all colors', 'Lowering opacity of text'] },
      { id: 'frontend-professional-8', question: 'Which strategy keeps CSS scalable in large apps?', options: ['Adopting utility-first or BEM methodologies with tooling', 'Writing global selectors for everything', 'Avoiding code reviews', 'Inline styling across files'] },
      { id: 'frontend-professional-9', question: 'What helps manage micro-frontend communication?', options: ['Shared event bus or federated modules', 'Duplicating state across teams', 'Relying on global variables only', 'Merging all bundles manually'] },
      { id: 'frontend-professional-10', question: 'Which API enables rich animations with high performance?', options: ['Web Animations API', 'Local Storage', 'WebSocket', 'Fetch'] },
    ],
  },
  'backend': {
    'Beginner': [
      { id: 'backend-beginner-1', question: 'What is a REST API?', options: ['A style of web services using standard HTTP methods', 'A desktop application', 'A CSS framework', 'An operating system'] },
      { id: 'backend-beginner-2', question: 'Which HTTP method is idempotent?', options: ['POST', 'PUT', 'PATCH', 'CONNECT'] },
      { id: 'backend-beginner-3', question: 'What does CRUD stand for?', options: ['Create, Read, Update, Delete', 'Cache, Route, Update, Deploy', 'Compile, Run, Upload, Debug', 'Create, Rollback, Upgrade, Deploy'] },
      { id: 'backend-beginner-4', question: 'Which database is relational?', options: ['PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch'] },
      { id: 'backend-beginner-5', question: 'What is an endpoint?', options: ['A URL that clients can access on an API', 'A database table', 'An HTML page', 'A CSS selector'] },
      { id: 'backend-beginner-6', question: 'Which tool manages Node.js packages?', options: ['npm', 'Pip', 'Composer', 'Gem'] },
      { id: 'backend-beginner-7', question: 'What does status code 404 mean?', options: ['Success', 'Resource not found', 'Server error', 'Unauthorized'] },
      { id: 'backend-beginner-8', question: 'What is middleware in backend frameworks?', options: ['Functions that handle requests before reaching routes', 'A type of database', 'A CSS preprocessor', 'A testing library'] },
      { id: 'backend-beginner-9', question: 'What is the purpose of environment variables?', options: ['Store configuration securely outside code', 'Style the UI', 'Render templates', 'Compress logs'] },
      { id: 'backend-beginner-10', question: 'What does JSON stand for?', options: ['JavaScript Object Notation', 'Java Service Object Network', 'Joined SQL Output Name', 'JavaScript Operation Node'] },
    ],
    'Intermediate': [
      { id: 'backend-intermediate-1', question: 'What does ACID ensure in databases?', options: ['Reliable transactions with atomicity, consistency, isolation, durability', 'High availability only', 'Faster queries only', 'Automatic caching'] },
      { id: 'backend-intermediate-2', question: 'Which pattern helps separate read and write operations?', options: ['CQRS', 'MVC', 'MVVM', 'Repository'] },
      { id: 'backend-intermediate-3', question: 'What is connection pooling?', options: ['Reusing database connections for efficiency', 'Creating multiple APIs', 'Caching HTTP responses', 'Managing CSS classes'] },
      { id: 'backend-intermediate-4', question: 'How do you secure APIs with JWT?', options: ['Issue signed tokens and validate them on protected routes', 'Store tokens in plain text', 'Disable HTTPS', 'Share tokens via email'] },
      { id: 'backend-intermediate-5', question: 'What is rate limiting used for?', options: ['Control the number of requests clients can make', 'Increase server CPU', 'Compress assets', 'Style dashboards'] },
      { id: 'backend-intermediate-6', question: 'Which tool monitors API performance?', options: ['Prometheus', 'Webpack', 'ESLint', 'Jest'] },
      { id: 'backend-intermediate-7', question: 'What does gRPC offer compared to REST?', options: ['Binary protocol with contract-based communication', 'Automatic UI generation', 'Graphical dashboards', 'Real-time sockets only'] },
      { id: 'backend-intermediate-8', question: 'Which database is good for caching key-value pairs?', options: ['Redis', 'PostgreSQL', 'Neo4j', 'SQLite'] },
      { id: 'backend-intermediate-9', question: 'What is a message queue used for?', options: ['Decouple services by buffering tasks', 'Render HTML templates', 'Run CSS animations', 'Encrypt passwords'] },
      { id: 'backend-intermediate-10', question: 'Which practice improves security posture of APIs?', options: ['Validation, sanitization, and principle of least privilege', 'Disabling logs', 'Allowing all origins', 'Using HTTP only'] },
    ],
    'Professional': [
      { id: 'backend-professional-1', question: 'How do you design for eventual consistency?', options: ['Accept temporary inconsistencies with compensating actions and sync processes', 'Force all writes synchronously', 'Avoid distributed systems', 'Disable replication'] },
      { id: 'backend-professional-2', question: 'Which approach supports high-throughput event processing?', options: ['Event sourcing with CQRS', 'Single-threaded processing', 'Synchronous blocking calls', 'Manual file transfers'] },
      { id: 'backend-professional-3', question: 'What is an effective way to handle database migrations?', options: ['Version-controlled scripts with rollback support', 'Manual SQL execution', 'Dropping tables and recreating', 'Ignoring schema changes'] },
      { id: 'backend-professional-4', question: 'Which pattern helps manage distributed transactions?', options: ['Saga pattern with compensating actions', 'Two-phase commit always', 'Ignoring failures', 'Single database only'] },
      { id: 'backend-professional-5', question: 'How do you implement idempotency in APIs?', options: ['Use idempotency keys and idempotent operations', 'Disable caching', 'Allow duplicate requests', 'Use only GET methods'] },
      { id: 'backend-professional-6', question: 'Which strategy improves database query performance?', options: ['Indexing, query optimization, and connection pooling', 'Running queries sequentially', 'Disabling indexes', 'Using SELECT * always'] },
      { id: 'backend-professional-7', question: 'What is an effective approach to API versioning?', options: ['URL versioning or header-based versioning with backward compatibility', 'Breaking changes without notice', 'No versioning strategy', 'Changing endpoints randomly'] },
      { id: 'backend-professional-8', question: 'How do you ensure data consistency in microservices?', options: ['Event-driven architecture with eventual consistency', 'Shared database across services', 'Synchronous calls only', 'No data sharing'] },
      { id: 'backend-professional-9', question: 'Which practice improves API reliability?', options: ['Retry logic with exponential backoff and circuit breakers', 'Failing fast always', 'No error handling', 'Single retry attempt'] },
      { id: 'backend-professional-10', question: 'What is an effective way to monitor distributed systems?', options: ['Distributed tracing with correlation IDs and metrics', 'Manual log checking', 'No monitoring', 'Single point monitoring'] },
    ],
  },
  'data-science': {
    'Beginner': [
      { id: 'data-science-beginner-1', question: 'What is the primary goal of data science?', options: ['To create websites', 'To extract insights from data', 'To design user interfaces', 'To manage servers'] },
      { id: 'data-science-beginner-2', question: 'What is the primary goal of data analysis?', options: ['Store data in spreadsheets', 'Extract insights to inform decisions', 'Increase file sizes', 'Disable data collection'] },
      { id: 'data-science-beginner-3', question: 'Which of the following is a common data format?', options: ['JPEG', 'CSV', 'MP3', 'PSD'] },
      { id: 'data-science-beginner-4', question: 'What does "cleaning data" mean?', options: ['Deleting all old files', 'Fixing errors and handling missing values', 'Compressing datasets', 'Locking spreadsheets'] },
      { id: 'data-science-beginner-5', question: 'Which library is popular for data manipulation in Python?', options: ['NumPy', 'Pandas', 'Matplotlib', 'TensorFlow'] },
      { id: 'data-science-beginner-6', question: 'What is a dataset?', options: ['A single number', 'A structured collection of related data', 'A graph with labels', 'A computer program'] },
      { id: 'data-science-beginner-7', question: 'What chart would you use to show data distribution?', options: ['Histogram', 'Pie chart', 'Line chart', 'Gantt chart'] },
      { id: 'data-science-beginner-8', question: 'What is the target variable in supervised learning?', options: ['Input feature', 'Hyperparameter', 'Label to predict', 'Model'] },
      { id: 'data-science-beginner-9', question: 'Which tool helps visualize data interactively?', options: ['Excel Formula', 'Tableau', 'Notepad', 'Paint'] },
      { id: 'data-science-beginner-10', question: 'What does bias in data imply?', options: ['Data is perfectly balanced', 'Systematic error affecting results', 'Random noise in data', 'Extra columns in dataset'] },
    ],
    'Intermediate': [
      { id: 'data-science-intermediate-1', question: 'What is the difference between classification and regression?', options: ['Classification predicts categories; regression predicts continuous values', 'Classification is faster than regression', 'Regression works only on images', 'They are the same'] },
      { id: 'data-science-intermediate-2', question: 'What does cross-validation help evaluate?', options: ['Model performance stability', 'Data loading speed', 'UI usability', 'Cloud deployment cost'] },
      { id: 'data-science-intermediate-3', question: 'Which metric is suitable for imbalanced classification?', options: ['Accuracy', 'Precision-Recall', 'MAE', 'R-squared'] },
      { id: 'data-science-intermediate-4', question: 'What is feature engineering?', options: ['Selecting hardware for clusters', 'Creating or transforming input variables to improve models', 'Changing project timelines', 'Encrypting datasets'] },
      { id: 'data-science-intermediate-5', question: 'Which technique reduces dimensionality?', options: ['PCA', 'Gradient boosting', 'Bagging', 'Bootstrapping'] },
      { id: 'data-science-intermediate-6', question: 'What is overfitting?', options: ['Model underperforms on training data', 'Model performs well on training but poorly on unseen data', 'Model uses too many features', 'Model runs quickly'] },
      { id: 'data-science-intermediate-7', question: 'Which algorithm is a clustering method?', options: ['K-Means', 'Logistic Regression', 'XGBoost', 'ARIMA'] },
      { id: 'data-science-intermediate-8', question: 'What is the role of a confusion matrix?', options: ['Visualize errors in classification', 'Optimize database schemas', 'Encrypt data in transit', 'Manage user access'] },
      { id: 'data-science-intermediate-9', question: 'Which approach can handle missing data?', options: ['Mean/median imputation', 'Dropping columns always', 'Randomizing values', 'Increasing batch size'] },
      { id: 'data-science-intermediate-10', question: 'Why use a validation set?', options: ['Tune hyperparameters without leaking test performance', 'Store raw data backups', 'Document experiments', 'Share reports with stakeholders'] },
    ],
    'Professional': [
      { id: 'data-science-professional-1', question: 'What is MLOps primarily concerned with?', options: ['Optimizing user experience', 'Operationalizing machine learning models at scale', 'Designing UI mockups', 'Creating marketing campaigns'] },
      { id: 'data-science-professional-2', question: 'Which technique helps interpret complex models?', options: ['SHAP values', 'Gradient descent', 'Learning rate schedule', 'Pooling'] },
      { id: 'data-science-professional-3', question: 'How would you address concept drift?', options: ['Ignore model performance metrics', 'Monitor data distribution and retrain models as needed', 'Increase training epochs indefinitely', 'Disable online learning'] },
      { id: 'data-science-professional-4', question: 'Which strategy enhances model fairness?', options: ['Oversampling underrepresented groups thoughtfully', 'Randomly removing data', 'Reducing feature count arbitrarily', 'Shortening training time'] },
      { id: 'data-science-professional-5', question: 'What is an appropriate approach to deploy a model with low downtime?', options: ['Shadow deployment', 'Manual file copy', 'Offline inference only', 'CSV handoff'] },
      { id: 'data-science-professional-6', question: 'How can you ensure reproducible experiments?', options: ['Version datasets, code, and configurations', 'Use informal documentation', 'Train models only once', 'Store experiments on local desktops'] },
      { id: 'data-science-professional-7', question: 'Which metric best tracks regression model drift in production?', options: ['ROC-AUC', 'Population stability index', 'Recall', 'BLEU score'] },
      { id: 'data-science-professional-8', question: 'How do you evaluate ROI of a machine learning initiative?', options: ['Measure business KPIs before and after deployment', 'Compare model size only', 'Estimate based on training accuracy', 'Ask team members to vote'] },
      { id: 'data-science-professional-9', question: 'What does a data governance program help establish?', options: ['Policies for data quality, ownership, and security', 'User interface guidelines', 'Hardware upgrade cycles', 'Office seating charts'] },
      { id: 'data-science-professional-10', question: 'Which approach supports scalable feature pipelines?', options: ['Feature stores with streaming support', 'Manual CSV updates', 'Spreadsheet macros', 'Quarterly notebooks run'] },
    ],
  },
  'cloud': {
    'Beginner': [
      { id: 'cloud-beginner-1', question: 'What is cloud computing?', options: ['Delivering computing services over the internet', 'Storing data on local hard drives', 'Using only desktop applications', 'Running servers in your office'] },
      { id: 'cloud-beginner-2', question: 'Which is a major cloud provider?', options: ['AWS', 'Microsoft Office', 'Adobe Photoshop', 'Google Chrome'] },
      { id: 'cloud-beginner-3', question: 'What does IaaS stand for?', options: ['Infrastructure as a Service', 'Internet as a System', 'Internal Application Server', 'Integrated Access System'] },
      { id: 'cloud-beginner-4', question: 'What is a virtual machine?', options: ['A software emulation of a physical computer', 'A physical server', 'A database table', 'A CSS file'] },
      { id: 'cloud-beginner-5', question: 'Which service provides scalable storage?', options: ['Object storage (S3, Blob)', 'Local file system', 'CD-ROM', 'USB drive'] },
      { id: 'cloud-beginner-6', question: 'What is auto-scaling?', options: ['Automatically adjusting resources based on demand', 'Manual server configuration', 'Static resource allocation', 'Disabling servers'] },
      { id: 'cloud-beginner-7', question: 'What does CDN stand for?', options: ['Content Delivery Network', 'Central Database Node', 'Cloud Data Network', 'Computer Device Name'] },
      { id: 'cloud-beginner-8', question: 'Which deployment model uses both public and private clouds?', options: ['Hybrid cloud', 'Public cloud only', 'Private cloud only', 'No cloud'] },
      { id: 'cloud-beginner-9', question: 'What is a load balancer used for?', options: ['Distributing traffic across multiple servers', 'Storing files', 'Rendering web pages', 'Compiling code'] },
      { id: 'cloud-beginner-10', question: 'Which service provides managed databases?', options: ['RDS, Cosmos DB', 'Local MySQL', 'Excel spreadsheets', 'Text files'] },
    ],
    'Intermediate': [
      { id: 'cloud-intermediate-1', question: 'What is Infrastructure as Code (IaC)?', options: ['Managing infrastructure through code and version control', 'Writing server documentation', 'Manual server setup', 'Using spreadsheets'] },
      { id: 'cloud-intermediate-2', question: 'Which tool is commonly used for IaC?', options: ['Terraform', 'Word', 'Excel', 'PowerPoint'] },
      { id: 'cloud-intermediate-3', question: 'What is a serverless function?', options: ['Code that runs without managing servers', 'A physical server', 'A database', 'A CSS file'] },
      { id: 'cloud-intermediate-4', question: 'What does VPC stand for?', options: ['Virtual Private Cloud', 'Very Powerful Computer', 'Virtual Public Connection', 'Volume Processing Center'] },
      { id: 'cloud-intermediate-5', question: 'Which practice improves cloud security?', options: ['Identity and Access Management (IAM)', 'Sharing credentials', 'Open ports to all', 'Disabling encryption'] },
      { id: 'cloud-intermediate-6', question: 'What is container orchestration?', options: ['Managing containerized applications at scale', 'Styling web pages', 'Writing SQL queries', 'Designing UI'] },
      { id: 'cloud-intermediate-7', question: 'Which service provides managed Kubernetes?', options: ['EKS, AKS, GKE', 'Local Docker', 'VirtualBox', 'VMware'] },
      { id: 'cloud-intermediate-8', question: 'What is a cloud region?', options: ['A geographic area with data centers', 'A programming language', 'A database type', 'A CSS framework'] },
      { id: 'cloud-intermediate-9', question: 'Which strategy reduces cloud costs?', options: ['Right-sizing resources and reserved instances', 'Using largest instances always', 'No monitoring', 'Manual scaling'] },
      { id: 'cloud-intermediate-10', question: 'What is disaster recovery in the cloud?', options: ['Backup and recovery strategies across regions', 'Deleting all data', 'Single region only', 'No backups'] },
    ],
    'Professional': [
      { id: 'cloud-professional-1', question: 'How do you design for multi-region high availability?', options: ['Active-active deployments with data replication', 'Single region only', 'No redundancy', 'Manual failover'] },
      { id: 'cloud-professional-2', question: 'Which approach improves cloud cost optimization?', options: ['FinOps practices with cost allocation and optimization', 'Ignoring costs', 'Using premium tiers always', 'No monitoring'] },
      { id: 'cloud-professional-3', question: 'What is a cloud landing zone?', options: ['A secure, scalable cloud foundation', 'A single server', 'A database', 'A CSS file'] },
      { id: 'cloud-professional-4', question: 'Which practice ensures cloud compliance?', options: ['Policy as Code with automated compliance checks', 'Manual audits only', 'No compliance', 'Ignoring regulations'] },
      { id: 'cloud-professional-5', question: 'How do you implement zero-trust security in the cloud?', options: ['Verify every request regardless of location', 'Trust all internal traffic', 'Disable authentication', 'Open all ports'] },
      { id: 'cloud-professional-6', question: 'What is cloud-native architecture?', options: ['Designing for cloud scalability and resilience', 'On-premise only', 'Desktop applications', 'Legacy systems'] },
      { id: 'cloud-professional-7', question: 'Which strategy improves cloud observability?', options: ['Centralized logging, metrics, and distributed tracing', 'No monitoring', 'Manual log checking', 'Single point monitoring'] },
      { id: 'cloud-professional-8', question: 'What is a cloud service mesh?', options: ['Infrastructure layer for service-to-service communication', 'A single service', 'A database', 'A CSS framework'] },
      { id: 'cloud-professional-9', question: 'How do you manage cloud vendor lock-in?', options: ['Multi-cloud strategies and abstraction layers', 'Single vendor only', 'No strategy', 'Manual migration'] },
      { id: 'cloud-professional-10', question: 'Which approach supports cloud cost forecasting?', options: ['Historical analysis and predictive modeling', 'Guessing costs', 'No forecasting', 'Fixed budgets only'] },
    ],
  },
  'ui/ux': {
    'Beginner': [
      { id: 'ui-ux-beginner-1', question: 'What does UX stand for?', options: ['User Experience', 'User XML', 'Universal Exchange', 'User Extension'] },
      { id: 'ui-ux-beginner-2', question: 'What does UI stand for?', options: ['User Interface', 'User Integration', 'Universal Interface', 'User Input'] },
      { id: 'ui-ux-beginner-3', question: 'What is a wireframe?', options: ['A low-fidelity layout of a page', 'A high-fidelity design', 'A color palette', 'A font'] },
      { id: 'ui-ux-beginner-4', question: 'Which tool is popular for UI design?', options: ['Figma', 'Excel', 'Word', 'PowerPoint'] },
      { id: 'ui-ux-beginner-5', question: 'What is usability testing?', options: ['Testing with real users to improve design', 'Code testing', 'Server testing', 'Database testing'] },
      { id: 'ui-ux-beginner-6', question: 'What is a persona in UX?', options: ['A fictional representation of a user', 'A real user', 'A design element', 'A color'] },
      { id: 'ui-ux-beginner-7', question: 'What does accessibility mean in design?', options: ['Designing for users with disabilities', 'Making designs prettier', 'Adding animations', 'Using more colors'] },
      { id: 'ui-ux-beginner-8', question: 'Which principle improves readability?', options: ['Contrast and typography', 'Using small fonts', 'No spacing', 'Complex layouts'] },
      { id: 'ui-ux-beginner-9', question: 'What is a design system?', options: ['A collection of reusable components and guidelines', 'A single design', 'A color', 'A font'] },
      { id: 'ui-ux-beginner-10', question: 'What is the purpose of user research?', options: ['Understanding user needs and behaviors', 'Writing code', 'Managing servers', 'Designing databases'] },
    ],
    'Intermediate': [
      { id: 'ui-ux-intermediate-1', question: 'What is information architecture?', options: ['Organizing and structuring content', 'Writing CSS', 'Managing servers', 'Designing databases'] },
      { id: 'ui-ux-intermediate-2', question: 'Which method helps understand user journeys?', options: ['User journey mapping', 'Code review', 'Server logs', 'Database queries'] },
      { id: 'ui-ux-intermediate-3', question: 'What is A/B testing used for?', options: ['Comparing two design variations', 'Writing code', 'Managing servers', 'Designing databases'] },
      { id: 'ui-ux-intermediate-4', question: 'What is a design token?', options: ['A reusable design value', 'A user', 'A page', 'A color'] },
      { id: 'ui-ux-intermediate-5', question: 'Which principle improves mobile UX?', options: ['Touch-friendly targets and responsive design', 'Small buttons', 'Complex navigation', 'No optimization'] },
      { id: 'ui-ux-intermediate-6', question: 'What is micro-interaction?', options: ['Small animations that provide feedback', 'A large animation', 'A page', 'A color'] },
      { id: 'ui-ux-intermediate-7', question: 'Which tool helps with prototyping?', options: ['Figma, Adobe XD', 'Excel', 'Word', 'PowerPoint'] },
      { id: 'ui-ux-intermediate-8', question: 'What is the purpose of a style guide?', options: ['Maintaining design consistency', 'Writing code', 'Managing servers', 'Designing databases'] },
      { id: 'ui-ux-intermediate-9', question: 'What is cognitive load in UX?', options: ['Mental effort required to use an interface', 'Server load', 'Database load', 'Network load'] },
      { id: 'ui-ux-intermediate-10', question: 'Which practice improves form UX?', options: ['Clear labels, validation, and helpful error messages', 'No labels', 'Complex validation', 'No error messages'] },
    ],
    'Professional': [
      { id: 'ui-ux-professional-1', question: 'What is design thinking?', options: ['A human-centered problem-solving approach', 'A coding methodology', 'A server management technique', 'A database design pattern'] },
      { id: 'ui-ux-professional-2', question: 'How do you measure UX success?', options: ['User satisfaction, task completion rates, and business metrics', 'Code quality only', 'Server uptime', 'Database size'] },
      { id: 'ui-ux-professional-3', question: 'What is inclusive design?', options: ['Designing for diverse user needs', 'Designing for one user type', 'Ignoring accessibility', 'No user research'] },
      { id: 'ui-ux-professional-4', question: 'Which approach improves design collaboration?', options: ['Shared design systems and regular design reviews', 'No collaboration', 'Email only', 'No feedback'] },
      { id: 'ui-ux-professional-5', question: 'What is the purpose of design ops?', options: ['Streamlining design workflows and tooling', 'Writing code', 'Managing servers', 'Designing databases'] },
      { id: 'ui-ux-professional-6', question: 'How do you ensure design scalability?', options: ['Modular design systems and component libraries', 'Copying designs', 'No system', 'Manual updates'] },
      { id: 'ui-ux-professional-7', question: 'What is the role of UX research in product development?', options: ['Informing design decisions with user insights', 'Writing code', 'Managing servers', 'Designing databases'] },
      { id: 'ui-ux-professional-8', question: 'Which practice improves design handoff?', options: ['Detailed specs and developer collaboration', 'No documentation', 'Email only', 'No communication'] },
      { id: 'ui-ux-professional-9', question: 'What is service design?', options: ['Designing end-to-end user experiences across touchpoints', 'A single page', 'A color', 'A font'] },
      { id: 'ui-ux-professional-10', question: 'How do you validate design assumptions?', options: ['User testing and data analysis', 'Guessing', 'No validation', 'Internal opinions only'] },
    ],
  },
  'ai/ml': {
    'Beginner': [
      { id: 'ai-ml-beginner-1', question: 'What does AI stand for?', options: ['Artificial Intelligence', 'Automated Integration', 'Advanced Interface', 'Application Interface'] },
      { id: 'ai-ml-beginner-2', question: 'What does ML stand for?', options: ['Machine Learning', 'Multiple Languages', 'Manual Learning', 'Memory Location'] },
      { id: 'ai-ml-beginner-3', question: 'What is supervised learning?', options: ['Learning from labeled data', 'Learning without data', 'Learning from unlabeled data', 'Manual programming'] },
      { id: 'ai-ml-beginner-4', question: 'What is unsupervised learning?', options: ['Finding patterns in unlabeled data', 'Learning from labels', 'Manual programming', 'No learning'] },
      { id: 'ai-ml-beginner-5', question: 'Which library is popular for machine learning in Python?', options: ['Scikit-learn', 'React', 'Express', 'MongoDB'] },
      { id: 'ai-ml-beginner-6', question: 'What is a neural network?', options: ['A computing system inspired by biological neural networks', 'A database', 'A CSS framework', 'A server'] },
      { id: 'ai-ml-beginner-7', question: 'What is training data?', options: ['Data used to teach a model', 'Data for testing', 'Random data', 'No data'] },
      { id: 'ai-ml-beginner-8', question: 'What is a model in machine learning?', options: ['A mathematical representation learned from data', 'A database', 'A CSS file', 'A server'] },
      { id: 'ai-ml-beginner-9', question: 'What is prediction in ML?', options: ['Using a model to make forecasts', 'Writing code', 'Managing servers', 'Designing UI'] },
      { id: 'ai-ml-beginner-10', question: 'What is deep learning?', options: ['Machine learning using neural networks with multiple layers', 'Shallow learning', 'No learning', 'Manual programming'] },
    ],
    'Intermediate': [
      { id: 'ai-ml-intermediate-1', question: 'What is overfitting in machine learning?', options: ['Model performs well on training but poorly on new data', 'Model performs poorly on training', 'Perfect model', 'No model'] },
      { id: 'ai-ml-intermediate-2', question: 'What is cross-validation?', options: ['Validating model performance across different data splits', 'Single test', 'No validation', 'Manual checking'] },
      { id: 'ai-ml-intermediate-3', question: 'What is feature selection?', options: ['Choosing relevant input variables', 'Selecting colors', 'Choosing fonts', 'Picking servers'] },
      { id: 'ai-ml-intermediate-4', question: 'What is a confusion matrix?', options: ['A table showing classification performance', 'A database', 'A CSS file', 'A server'] },
      { id: 'ai-ml-intermediate-5', question: 'What is gradient descent?', options: ['An optimization algorithm', 'A database', 'A CSS framework', 'A server'] },
      { id: 'ai-ml-intermediate-6', question: 'What is transfer learning?', options: ['Using a pre-trained model for a new task', 'Training from scratch', 'No learning', 'Manual programming'] },
      { id: 'ai-ml-intermediate-7', question: 'What is natural language processing?', options: ['Teaching computers to understand human language', 'Writing code', 'Managing servers', 'Designing UI'] },
      { id: 'ai-ml-intermediate-8', question: 'What is computer vision?', options: ['Teaching computers to interpret visual information', 'Writing code', 'Managing servers', 'Designing UI'] },
      { id: 'ai-ml-intermediate-9', question: 'What is reinforcement learning?', options: ['Learning through trial and error with rewards', 'Supervised learning', 'Unsupervised learning', 'No learning'] },
      { id: 'ai-ml-intermediate-10', question: 'What is a hyperparameter?', options: ['A parameter set before training', 'A learned parameter', 'A database', 'A CSS file'] },
    ],
    'Professional': [
      { id: 'ai-ml-professional-1', question: 'What is MLOps?', options: ['Operationalizing machine learning models', 'Writing code', 'Managing servers', 'Designing UI'] },
      { id: 'ai-ml-professional-2', question: 'What is model interpretability?', options: ['Understanding how models make decisions', 'Ignoring model behavior', 'No understanding', 'Manual analysis'] },
      { id: 'ai-ml-professional-3', question: 'What is federated learning?', options: ['Training models across decentralized data', 'Single server training', 'No training', 'Manual programming'] },
      { id: 'ai-ml-professional-4', question: 'What is model drift?', options: ['Model performance degradation over time', 'Perfect model', 'No model', 'Manual model'] },
      { id: 'ai-ml-professional-5', question: 'What is A/B testing for ML models?', options: ['Comparing model versions in production', 'Single model', 'No testing', 'Manual testing'] },
      { id: 'ai-ml-professional-6', question: 'What is feature engineering?', options: ['Creating meaningful input variables', 'Selecting colors', 'Choosing fonts', 'Picking servers'] },
      { id: 'ai-ml-professional-7', question: 'What is ensemble learning?', options: ['Combining multiple models', 'Single model', 'No models', 'Manual models'] },
      { id: 'ai-ml-professional-8', question: 'What is automated machine learning (AutoML)?', options: ['Automating ML workflow steps', 'Manual ML', 'No ML', 'Guessing'] },
      { id: 'ai-ml-professional-9', question: 'What is responsible AI?', options: ['Ethical and fair AI practices', 'Unethical AI', 'No ethics', 'Random AI'] },
      { id: 'ai-ml-professional-10', question: 'What is model versioning?', options: ['Tracking different model versions', 'Single version', 'No versioning', 'Manual versioning'] },
    ],
  },
};

// Extract skill and level from group name (format: "SkillName Level Circle")
const extractSkillAndLevel = (groupName) => {
  if (!groupName) return { skill: null, level: null };
  const name = groupName.trim();
  // Remove "Circle" suffix if present
  const cleaned = name.replace(/\s+Circle$/, '').trim();
  
  // Match skill and level patterns
  const skillMap = {
    'cybersecurity': 'cybersecurity',
    'data-science': 'data-science',
    'data science': 'data-science',
    'fullstack': 'fullstack',
    'full-stack': 'fullstack',
    'frontend': 'frontend',
    'front-end': 'frontend',
    'backend': 'backend',
    'back-end': 'backend',
  };
  
  const levels = ['Beginner', 'Intermediate', 'Professional'];
  
  let matchedSkill = null;
  let matchedLevel = null;
  
  // Try to find skill
  for (const [key, value] of Object.entries(skillMap)) {
    if (cleaned.toLowerCase().includes(key.toLowerCase())) {
      matchedSkill = value;
      break;
    }
  }
  
  // Try to find level
  for (const level of levels) {
    if (cleaned.includes(level)) {
      matchedLevel = level;
      break;
    }
  }
  
  return { skill: matchedSkill, level: matchedLevel };
};

// API base route - defined early to ensure it's accessible before other /api/* routes
app.get('/api', (req, res) => {
  console.log('[API] GET /api - Request received');
  res.json({ 
    message: 'CodeCircle API', 
    status: 'running',
    version: '1.0.0',
    baseUrl: '/api',
    endpoints: {
      auth: {
        login: 'POST /api/auth/login',
        signup: 'POST /api/auth/signup',
        register: 'POST /api/register (legacy)',
        loginLegacy: 'POST /api/login (legacy)'
      },
      users: {
        getAll: 'GET /api/users',
        getOne: 'GET /api/users/:userId',
        update: 'PUT /api/users/:userId (auth required)',
        delete: 'DELETE /api/users/:userId (auth required)',
        getFriends: 'GET /api/friends (auth required)'
      },
      onboarding: {
        complete: 'POST /api/onboarding/complete (auth required)'
      },
      friends: {
        request: 'POST /api/friends/request (auth required)',
        respond: 'POST /api/friends/respond (auth required)',
        get: 'GET /api/friends (auth required)',
        add: 'POST /api/friends/add/:targetUserId (auth required)',
        accept: 'POST /api/friends/accept/:requesterId (auth required)',
        decline: 'DELETE /api/friends/decline/:requesterId (auth required)'
      },
      techGroups: {
        getAll: 'GET /api/tech-groups',
        getOne: 'GET /api/tech-groups/:groupId',
        create: 'POST /api/tech-groups',
        update: 'PATCH /api/tech-groups/:groupId (auth required)',
        delete: 'DELETE /api/tech-groups/:groupId (auth required)',
        join: 'POST /api/tech-groups/:groupId/join-requests (auth required)',
        addMember: 'POST /api/tech-groups/:groupId/members',
        removeMember: 'DELETE /api/tech-groups/:groupId/members/:userId (auth required)',
        archivedMessages: 'GET /api/tech-groups/:groupId/messages/archived',
        archiveMessage: 'POST /api/tech-groups/:groupId/messages/:messageId/archive'
      },
      conversations: {
        getAll: 'GET /api/conversations (auth required) - Aggregates private chats and tech groups',
        getMessages: 'GET /api/conversations/:conversationId/messages (auth required) - Get messages for a conversation'
      },
      classrooms: 'GET /api/classrooms (auth required) - Get all classrooms',
      privateChats: {
        getAll: 'GET /api/private-chats (auth required)',
        getOne: 'GET /api/private-chats/:chatId (auth required)',
        create: 'POST /api/private-chats (auth required)',
        update: 'PUT /api/private-chats/:chatId (auth required)',
        delete: 'DELETE /api/private-chats/:chatId (auth required)'
      },
      classroomRequests: {
        getAll: 'GET /api/classroom-requests (auth required)',
        create: 'POST /api/classroom-requests (auth required)',
        update: 'PUT /api/classroom-requests/:requestId (auth required)',
        delete: 'DELETE /api/classroom-requests/:requestId (auth required)',
        approve: 'POST /api/admin/classroom-requests/:requestId/approve (admin)',
        decline: 'POST /api/admin/classroom-requests/:requestId/decline (admin)',
        adminGetAll: 'GET /api/admin/classroom-requests (admin)'
      },
      trainingRequests: {
        getAll: 'GET /api/training-requests (auth required)',
        getOne: 'GET /api/training-requests/:requestId (auth required)',
        create: 'POST /api/training-requests (auth required)',
        update: 'PUT /api/training-requests/:requestId (auth required)',
        delete: 'DELETE /api/training-requests/:requestId (auth required)'
      },
      admin: {
        analytics: 'GET /api/admin/analytics (admin)',
        users: 'GET /api/admin/users (admin)',
        suspendUser: 'POST /api/admin/users/:userId/suspend (admin)',
        restoreUser: 'POST /api/admin/users/:userId/restore (admin)',
        deleteUser: 'POST /api/admin/users/:userId/delete (admin)',
        logs: {
          getAll: 'GET /api/admin/logs (admin)',
          getOne: 'GET /api/admin/logs/:logId (admin)',
          create: 'POST /api/admin/logs (admin)'
        },
        violations: {
          getAll: 'GET /api/admin/violations (admin)',
          getOne: 'GET /api/admin/violations/:violationId (admin)',
          create: 'POST /api/admin/violations (admin)',
          update: 'PUT /api/admin/violations/:violationId (admin)',
          delete: 'DELETE /api/admin/violations/:violationId (admin)'
        }
      },
      uploads: {
        upload: 'POST /api/uploads'
      },
      translate: {
        translate: 'POST /api/translate'
      }
    },
    documentation: 'See API_ROUTES_SUMMARY.md for complete API documentation'
  });
});

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
// POST /api/auth/signup - User registration endpoint
app.post('/api/auth/signup', async (req, res) => {
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

// Legacy endpoint (for backward compatibility)
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
      return sendError(res, 401, ERROR_CODES.INVALID_CREDENTIALS, 'INVALID_CREDENTIALS');
    }
    if (error.message.includes('suspended') || error.message.includes('deleted')) {
      return sendError(res, 403, error.message, 'ACCOUNT_SUSPENDED');
    }
    sendError(res, 500, ERROR_CODES.SERVER_ERROR, 'LOGIN_FAILED');
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
      return sendError(res, 401, ERROR_CODES.INVALID_CREDENTIALS, 'INVALID_CREDENTIALS');
    }
    if (error.message.includes('suspended') || error.message.includes('deleted')) {
      return sendError(res, 403, error.message, 'ACCOUNT_SUSPENDED');
    }
    sendError(res, 500, ERROR_CODES.SERVER_ERROR, 'LOGIN_FAILED');
  }
});

app.get('/api/users', async (req, res) => {
  try {
    console.log('[API] GET /api/users - Request received');
    
    // Check MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      console.warn('[API] GET /api/users - Database not connected, returning empty array');
      return res.json([]);
    }
    
    const usersList = await User.find({}, { password: 0 }).select('userId username online lastSeen').lean();
    const result = Array.isArray(usersList) ? usersList : [];
    
    console.log(`[API] GET /api/users - Returning ${result.length} users`);
    res.json(result);
  } catch (error) {
    console.error('[API] GET /api/users - Error:', error);
    // Return empty array instead of 500 error
    res.json([]);
  }
});

// Helper function to get friends data (used by both /api/friends and /api/users/friends)
const getFriendsData = async (req, res) => {
  try {
    console.log('[API] GET /api/friends - Request received for user:', req.user?.userId);
    
    // Check MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      console.warn('[API] GET /api/friends - Database not connected, returning empty payload');
      return res.json({ friends: [], friendRequests: [], sentFriendRequests: [] });
    }
    
    const currentUser = await User.findOne({ userId: req.user.userId });
    if (!currentUser) {
      console.warn('[API] GET /api/friends - User not found:', req.user.userId);
      return res.status(404).json({ error: 'User not found' });
    }
    
    const payload = await buildFriendPayload(req.user.userId);
    console.log(`[API] GET /api/friends - Returning payload for user: ${req.user.userId}`);
    // Return in format expected by frontend: { friends, friendRequests, sentFriendRequests }
    res.json({
      friends: payload.friends || [],
      friendRequests: payload.incomingRequests || [],
      sentFriendRequests: payload.outgoingRequests || []
    });
  } catch (error) {
    console.error('[API] GET /api/friends - Error:', error);
    // Return empty payload instead of 500 error
    res.json({ friends: [], friendRequests: [], sentFriendRequests: [] });
  }
};

app.get('/api/friends', authenticateJWT, getFriendsData);
app.get('/api/users/friends', authenticateJWT, getFriendsData);

// DELETE /api/friends/request/:targetUserId - Cancel outgoing friend request
app.delete('/api/friends/request/:targetUserId', authenticateJWT, async (req, res) => {
  try {
    const { targetUserId } = req.params;
    if (!targetUserId) {
      return res.status(400).json({ error: 'Target user ID is required' });
    }

    const currentUser = await User.findOne({ userId: req.user.userId });
    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Remove from sentFriendRequests array
    if (Array.isArray(currentUser.sentFriendRequests)) {
      currentUser.sentFriendRequests = currentUser.sentFriendRequests.filter(id => id !== targetUserId);
    }

    // Also remove from target user's friendRequests (incoming)
    const targetUser = await User.findOne({ userId: targetUserId });
    if (targetUser && Array.isArray(targetUser.friendRequests)) {
      targetUser.friendRequests = targetUser.friendRequests.filter(id => id !== req.user.userId);
      await targetUser.save();
    }

    await currentUser.save();

    // Emit socket event if socket instance exists
    try {
      const ioInstance = req.app.get('io');
      if (ioInstance) {
        // Emit to all - target user will handle filtering
        ioInstance.emit('friend:request:cancelled', {
          fromUserId: req.user.userId,
          fromUsername: req.user.username,
          targetUserId
        });
      }
    } catch (socketError) {
      console.warn('[API] Socket notification failed (non-fatal):', socketError);
    }

    res.json({ success: true, message: 'Friend request cancelled' });
  } catch (error) {
    console.error('[API] DELETE /api/friends/request/:targetUserId - Error:', error);
    sendError(res, 500, ERROR_CODES.SERVER_ERROR, 'FRIEND_REQUEST_CANCEL_FAILED');
  }
});

app.post('/api/onboarding/complete', authenticateJWT, async (req, res) => {
  try {
    console.log('[Onboarding] POST /api/onboarding/complete - Request received');
    console.log('[Onboarding] Request body:', req.body);
    console.log('[Onboarding] User ID:', req.user?.userId);
    
    // Check MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      console.error('[Onboarding] Database not connected');
      return res.status(503).json({ 
        error: 'Database connection unavailable',
        message: 'MongoDB is not connected. Please try again in a moment.'
      });
    }
    
    const currentUser = await User.findOne({ userId: req.user.userId });
    if (!currentUser) {
      console.error('[Onboarding] User not found:', req.user.userId);
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('[Onboarding] Current user onboarding status:', currentUser.onboardingCompleted);
    
    // Update onboarding status and save skills/skillLevel if provided
    if (req.body.skills) {
      currentUser.skills = Array.isArray(req.body.skills) ? req.body.skills : [];
    }
    if (req.body.skillLevel) {
      currentUser.skillLevel = req.body.skillLevel;
    }
    if (req.body.answers) {
      currentUser.onboardingAnswers = req.body.answers;
    }
    
    if (!currentUser.onboardingCompleted) {
      currentUser.onboardingCompleted = true;
      await currentUser.save();
      
      // Ensure core groups - wrap in try/catch to prevent onboarding failure
      try {
        await ensureCoreGroupsForUser(currentUser);
        console.log('[Onboarding] Core groups ensured for user:', currentUser.username);
      } catch (groupError) {
        console.error('[Onboarding] Error ensuring core groups (non-fatal):', groupError);
        // Don't fail onboarding if groups fail to create
      }
      
      console.log('[Onboarding] Onboarding marked as complete for user:', currentUser.username);
    } else {
      // Still save any updates even if already completed
      await currentUser.save();
      console.log('[Onboarding] User already completed onboarding, updated profile data');
    }

    res.json({ 
      onboardingCompleted: true,
      user: {
        userId: currentUser.userId,
        username: currentUser.username,
        onboardingCompleted: currentUser.onboardingCompleted,
        skills: currentUser.skills || [],
        skillLevel: currentUser.skillLevel
      }
    });
  } catch (error) {
    console.error('[Onboarding] Onboarding completion error:', error);
    console.error('[Onboarding] Error stack:', error.stack);
    sendError(res, 500, ERROR_CODES.SERVER_ERROR, 'ONBOARDING_UPDATE_FAILED');
  }
});

// POST /api/friends/request - Send friend request by username or email
app.post('/api/friends/request', authenticateJWT, async (req, res) => {
  try {
    const { targetUsername, targetEmail } = req.body || {};
    const identifier = targetUsername?.trim() || targetEmail?.trim();
    
    if (!identifier) {
      return res.status(400).json({ error: 'Username or email is required' });
    }

    // Find user by username or email
    const targetUser = await User.findOne({
      $or: [
        { username: { $regex: new RegExp(`^${identifier}$`, 'i') } },
        { email: { $regex: new RegExp(`^${identifier}$`, 'i') } }
      ],
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (targetUser.userId === req.user.userId) {
      return res.status(400).json({ error: 'You cannot add yourself as a friend' });
    }

    const requesterId = req.user.userId;
    const recipientId = targetUser.userId;

    // Check if friendship already exists
    const existingFriendship = await Friendship.findOne({
      $or: [
        { requesterId, recipientId },
        { requesterId: recipientId, recipientId: requesterId }
      ]
    });

    if (existingFriendship) {
      if (existingFriendship.status === 'accepted') {
        return res.status(400).json({ error: 'You are already friends' });
      }
      if (existingFriendship.status === 'pending') {
        if (existingFriendship.requesterId === requesterId) {
          return res.status(400).json({ error: 'Friend request already sent' });
        } else {
          return res.status(400).json({ error: 'This user has already sent you a friend request' });
        }
      }
    }

    // Create new friendship request
    const friendship = new Friendship({
      requesterId,
      recipientId,
      status: 'pending',
    });

    await friendship.save();

    // Emit socket event
    const targetSocket = userSockets.get(recipientId);
    if (targetSocket && io) {
      io.to(targetSocket).emit('friend:request', {
        userId: requesterId,
        username: req.user.username,
      });
    }

    const payload = await buildFriendPayload(requesterId);
    // Return in format expected by frontend
    res.json({
      friends: payload.friends || [],
      friendRequests: payload.incomingRequests || [],
      sentFriendRequests: payload.outgoingRequests || [],
      message: 'Friend request sent successfully'
    });
  } catch (error) {
    console.error('[API] POST /api/friends/request - Error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Friend request already exists' });
    }
    res.status(500).json({ error: 'Unable to send friend request right now.' });
  }
});

// POST /api/friends/respond - Accept or reject friend request
app.post('/api/friends/respond', authenticateJWT, async (req, res) => {
  try {
    const { requesterId, action } = req.body || {};
    if (!requesterId || !action) {
      return res.status(400).json({ error: 'Requester and action are required' });
    }

    const normalizedAction = action.toLowerCase();
    if (!['accept', 'decline', 'reject'].includes(normalizedAction)) {
      return res.status(400).json({ error: 'Invalid action. Use "accept" or "decline"' });
    }

    const recipientId = req.user.userId;
    const isAccept = normalizedAction === 'accept';

    // Find friendship
    const friendship = await Friendship.findOne({
      requesterId,
      recipientId,
      status: 'pending',
    });

    if (!friendship) {
      return res.status(404).json({ error: 'No pending friend request found' });
    }

    if (isAccept) {
      // Accept friendship
      friendship.status = 'accepted';
      await friendship.save();

      // Create private conversation
      try {
        await createPrivateConversation(requesterId, recipientId, friendship._id);
      } catch (convError) {
        console.error('[API] Failed to create private conversation:', convError);
        // Don't fail the request if conversation creation fails
      }

      // Emit socket events
      if (io) {
        const requesterSocket = userSockets.get(requesterId);
        if (requesterSocket) {
          io.to(requesterSocket).emit('friend:request:updated', {
            userId: recipientId,
            username: req.user.username,
            status: 'accepted',
          });
        }
      }
    } else {
      // Reject/decline friendship
      friendship.status = 'rejected';
      await friendship.save();

      // Emit socket event
      if (io) {
        const requesterSocket = userSockets.get(requesterId);
        if (requesterSocket) {
          io.to(requesterSocket).emit('friend:request:updated', {
            userId: recipientId,
            username: req.user.username,
            status: 'rejected',
          });
        }
      }
    }

    const payload = await buildFriendPayload(recipientId);
    res.json(payload);
  } catch (error) {
    console.error('[API] POST /api/friends/respond - Error:', error);
    sendError(res, 500, ERROR_CODES.SERVER_ERROR, 'FRIEND_REQUEST_PROCESS_FAILED');
  }
});

// POST /api/friends/request/:requesterId/respond - Alternative endpoint (uses URL param, supports accept: boolean)
app.post('/api/friends/request/:requesterId/respond', authenticateJWT, async (req, res) => {
  try {
    const { requesterId } = req.params;
    const { accept } = req.body || {};
    
    if (!requesterId) {
      return res.status(400).json({ error: 'Requester ID is required' });
    }
    
    if (typeof accept !== 'boolean') {
      return res.status(400).json({ error: 'Accept (boolean) is required in request body' });
    }

    const action = accept ? 'accept' : 'decline';
    const recipientId = req.user.userId;

    // Find friendship
    const friendship = await Friendship.findOne({
      requesterId,
      recipientId,
      status: 'pending',
    });

    if (!friendship) {
      return res.status(404).json({ error: 'No pending friend request found' });
    }

    if (accept) {
      // Accept friendship
      friendship.status = 'accepted';
      await friendship.save();

      // Create private conversation
      try {
        await createPrivateConversation(requesterId, recipientId, friendship._id);
      } catch (convError) {
        console.error('[API] Failed to create private conversation:', convError);
      }

      // Emit socket events
      if (io) {
        const requesterSocket = userSockets.get(requesterId);
        if (requesterSocket) {
          io.to(requesterSocket).emit('friend:request:updated', {
            userId: recipientId,
            username: req.user.username,
            status: 'accepted',
          });
        }
      }
    } else {
      // Reject/decline friendship
      friendship.status = 'rejected';
      await friendship.save();

      // Emit socket event
      if (io) {
        const requesterSocket = userSockets.get(requesterId);
        if (requesterSocket) {
          io.to(requesterSocket).emit('friend:request:updated', {
            userId: recipientId,
            username: req.user.username,
            status: 'rejected',
          });
        }
      }
    }

    const payload = await buildFriendPayload(recipientId);
    // Return in format expected by frontend
    res.json({
      friends: payload.friends || [],
      friendRequests: payload.incomingRequests || [],
      sentFriendRequests: payload.outgoingRequests || [],
      message: accept ? 'Friend request accepted' : 'Friend request declined'
    });
  } catch (error) {
    console.error('[API] POST /api/friends/request/:requesterId/respond - Error:', error);
    sendError(res, 500, ERROR_CODES.SERVER_ERROR, 'FRIEND_REQUEST_RESPOND_FAILED');
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
    console.log('[API] GET /api/classroom-requests - Request received for user:', req.user?.userId);
    
    // Check MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      console.warn('[API] GET /api/classroom-requests - Database not connected, returning empty array');
      return res.json([]);
    }
    
    const requests = await ClassroomRequest.find({ createdBy: req.user.userId }).sort({
      createdAt: -1,
    }).lean();
    
    const result = Array.isArray(requests) ? requests.map(serializeClassroomRequest) : [];
    console.log(`[API] GET /api/classroom-requests - Returning ${result.length} requests`);
    res.json(result);
  } catch (error) {
    console.error('[API] GET /api/classroom-requests - Error:', error);
    // Return empty array instead of 500 error
    res.json([]);
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

// ==================== LIVE SESSION APPLICATION ENDPOINTS ====================

const serializeLiveSessionApplication = (app) => ({
  applicationId: app.applicationId,
  userId: app.userId,
  username: app.username,
  techSkill: app.techSkill,
  message: app.message || '',
  availability: app.availability || '',
  status: app.status,
  roomId: app.roomId || null,
  approvedBy: app.approvedBy || null,
  approvedByUsername: app.approvedByUsername || null,
  approvedAt: app.approvedAt || null,
  rejectedAt: app.rejectedAt || null,
  adminNotes: app.adminNotes || '',
  createdAt: app.createdAt,
  updatedAt: app.updatedAt,
});

// Helper to get room ID from tech skill
const getRoomIdFromTechSkill = (techSkill) => {
  // Normalize tech skill to room ID format
  const normalized = techSkill.toLowerCase().replace(/\s+/g, '-');
  return `room-${normalized}`;
};

// Apply for live session
app.post('/api/live-sessions/apply', authenticateJWT, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({error: 'Database not connected'});
    }

    const {techSkill, message = '', availability = ''} = req.body || {};

    if (!techSkill || typeof techSkill !== 'string' || techSkill.trim().length === 0) {
      return res.status(400).json({error: 'Tech skill is required'});
    }

    // Check if user already has a pending application
    const existingPending = await LiveSessionApplication.findOne({
      userId: req.user.userId,
      status: 'pending',
    });

    if (existingPending) {
      return res.status(400).json({error: 'You already have a pending application'});
    }

    // Check if user already has an accepted application
    const existingAccepted = await LiveSessionApplication.findOne({
      userId: req.user.userId,
      status: 'accepted',
    });

    if (existingAccepted) {
      return res.status(400).json({
        error: 'You already have an accepted application',
        application: serializeLiveSessionApplication(existingAccepted),
      });
    }

    const application = new LiveSessionApplication({
      applicationId: generateId(),
      userId: req.user.userId,
      username: req.user.username,
      techSkill: techSkill.trim(),
      message: message.trim().substring(0, 500),
      availability: availability.trim().substring(0, 200),
      status: 'pending',
    });

    await application.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('live-session:application:created', serializeLiveSessionApplication(application));
    }

    res.status(201).json(serializeLiveSessionApplication(application));
  } catch (error) {
    console.error('Apply for live session error:', error);
    res.status(500).json({error: 'Unable to submit application right now.'});
  }
});

// Get user's application status
app.get('/api/live-sessions/application/status', authenticateJWT, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({error: 'Database not connected'});
    }

    const application = await LiveSessionApplication.findOne({
      userId: req.user.userId,
    }).sort({createdAt: -1});

    if (!application) {
      return res.json({status: 'none', application: null});
    }

    res.json({
      status: application.status,
      application: serializeLiveSessionApplication(application),
    });
  } catch (error) {
    console.error('Get application status error:', error);
    res.status(500).json({error: 'Unable to fetch application status right now.'});
  }
});

// Admin: Get all applications
app.get('/api/admin/live-sessions/applications', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({error: 'Database not connected'});
    }

    const {status} = req.query;
    const query = status && ['pending', 'accepted', 'rejected'].includes(status) ? {status} : {};

    const applications = await LiveSessionApplication.find(query).sort({createdAt: -1});
    res.json(applications.map(serializeLiveSessionApplication));
  } catch (error) {
    console.error('Get all applications error:', error);
    res.status(500).json({error: 'Unable to fetch applications right now.'});
  }
});

// Admin: Approve application
app.post('/api/admin/live-sessions/applications/:applicationId/approve', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({error: 'Database not connected'});
    }

    const {applicationId} = req.params;
    const {adminNotes = ''} = req.body || {};

    const application = await LiveSessionApplication.findOne({applicationId});
    if (!application) {
      return res.status(404).json({error: 'Application not found'});
    }

    if (application.status !== 'pending') {
      return res.status(400).json({error: 'Application already processed'});
    }

    // Assign room based on tech skill
    const roomId = getRoomIdFromTechSkill(application.techSkill);

    application.status = 'accepted';
    application.roomId = roomId;
    application.approvedBy = req.user.userId;
    application.approvedByUsername = req.user.username;
    application.approvedAt = new Date();
    application.adminNotes = adminNotes.trim().substring(0, 500);
    await application.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('live-session:application:updated', serializeLiveSessionApplication(application));
      const userRoom = `user:${application.userId}`;
      io.to(userRoom).emit('live-session:application:approved', serializeLiveSessionApplication(application));
    }

    res.json(serializeLiveSessionApplication(application));
  } catch (error) {
    console.error('Approve application error:', error);
    res.status(500).json({error: 'Unable to approve application right now.'});
  }
});

// Admin: Reject application
app.post('/api/admin/live-sessions/applications/:applicationId/reject', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({error: 'Database not connected'});
    }

    const {applicationId} = req.params;
    const {adminNotes = ''} = req.body || {};

    const application = await LiveSessionApplication.findOne({applicationId});
    if (!application) {
      return res.status(404).json({error: 'Application not found'});
    }

    if (application.status !== 'pending') {
      return res.status(400).json({error: 'Application already processed'});
    }

    application.status = 'rejected';
    application.approvedBy = req.user.userId;
    application.approvedByUsername = req.user.username;
    application.rejectedAt = new Date();
    application.adminNotes = adminNotes.trim().substring(0, 500);
    await application.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('live-session:application:updated', serializeLiveSessionApplication(application));
      const userRoom = `user:${application.userId}`;
      io.to(userRoom).emit('live-session:application:rejected', serializeLiveSessionApplication(application));
    }

    res.json(serializeLiveSessionApplication(application));
  } catch (error) {
    console.error('Reject application error:', error);
    res.status(500).json({error: 'Unable to reject application right now.'});
  }
});

// Get room details
app.get('/api/live-sessions/rooms/:roomId', authenticateJWT, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({error: 'Database not connected'});
    }

    const {roomId} = req.params;

    // Check if user has access to this room
    const application = await LiveSessionApplication.findOne({
      userId: req.user.userId,
      roomId,
      status: 'accepted',
    });

    if (!application && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({error: 'Access denied to this room'});
    }

    // Get all users in this room
    const roomApplications = await LiveSessionApplication.find({
      roomId,
      status: 'accepted',
    });

    const participants = roomApplications.map((app) => ({
      userId: app.userId,
      username: app.username,
      techSkill: app.techSkill,
      joinedAt: app.approvedAt || app.createdAt,
    }));

    res.json({
      roomId,
      techSkill: application?.techSkill || roomId.replace('room-', '').replace(/-/g, ' '),
      participants,
      participantCount: participants.length,
    });
  } catch (error) {
    console.error('Get room details error:', error);
    res.status(500).json({error: 'Unable to fetch room details right now.'});
  }
});

const serializeGroup = (group) => ({
  groupId: group.groupId,
  name: group.name,
  description: group.description || '',
  type: group.type || 'community',
  createdBy: group.createdBy,
  memberCount: Array.isArray(group.members) ? group.members.length : 0,
  members: Array.isArray(group.members) ? group.members : [],
  admins: Array.isArray(group.admins) ? group.admins : [],
  pendingJoinCount: Array.isArray(group.joinRequests)
    ? group.joinRequests.filter((req) => req.status === 'pending').length
    : 0,
  topics: Array.isArray(group.topics) ? group.topics : [],
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
    console.log('[API] GET /api/tech-groups - Request received');
    
    // Set timeout for response
    res.setTimeout(10000, () => {
      console.error('[API] GET /api/tech-groups - Request timeout after 10s');
      if (!res.headersSent) {
        res.status(504).json({ error: 'Request timeout' });
      }
    });
    
    // Check MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      console.warn('[API] GET /api/tech-groups - Database not connected, returning empty array');
      return res.json([]);
    }
    
    const { search } = req.query;
    const query = search && search.trim()
      ? { name: { $regex: new RegExp(search.trim(), 'i') } }
      : {};

    console.log('[API] GET /api/tech-groups - Querying database...');
    const groups = await TechGroup.find(query).sort({ createdAt: -1 }).limit(100).lean();
    console.log(`[API] GET /api/tech-groups - Found ${groups.length} groups`);
    
    const result = Array.isArray(groups) ? groups.map(serializeGroup) : [];
    
    console.log(`[API] GET /api/tech-groups - Returning ${result.length} groups`);
    res.json(result);
  } catch (error) {
    console.error('[API] GET /api/tech-groups - Error:', error);
    // Return empty array instead of 500 error
    if (!res.headersSent) {
      res.json([]);
    }
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
    console.log('[API] GET /api/tech-groups/:groupId/messages/archived - Request received', req.params.groupId);
    
    // Check MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      console.warn('[API] GET /api/tech-groups/:groupId/messages/archived - Database not connected, returning empty array');
      return res.json([]);
    }
    
    const { groupId } = req.params;
    const group = await TechGroup.findOne({ groupId });
    if (!group) {
      console.warn('[API] GET /api/tech-groups/:groupId/messages/archived - Group not found:', groupId);
      return res.status(404).json({ error: 'Tech group not found' });
    }

    await autoArchiveTechGroupMessages(group);
    const archived = filterArchivedMessages(group.messages || []);
    const result = Array.isArray(archived) ? archived : [];
    
    console.log(`[API] GET /api/tech-groups/:groupId/messages/archived - Returning ${result.length} archived messages`);
    return res.json(result);
  } catch (error) {
    console.error('[API] GET /api/tech-groups/:groupId/messages/archived - Error:', error);
    // Return empty array instead of 500 error
    return res.json([]);
  }
});

// ========== ASSESSMENT ENDPOINTS ==========
// GET /api/tech-groups/:slug/assessment-status - Get assessment status for user
app.get('/api/tech-groups/:slug/assessment-status', authenticateJWT, async (req, res) => {
  try {
    console.log('[API] GET /api/tech-groups/:slug/assessment-status - Request received', req.params.slug);
    
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: 'Database connection unavailable' });
    }
    
    const { slug } = req.params;
    const group = await findTechGroupBySlug(slug);
    if (!group) {
      return res.status(404).json({ error: 'Tech group not found' });
    }
    
    // Check if user has completed assessment (has join request with status)
    const joinRequest = Array.isArray(group.joinRequests) 
      ? group.joinRequests.find(req => req.userId === req.user.userId)
      : null;
    
    res.json({
      completed: joinRequest ? joinRequest.status !== 'pending' : false,
      status: joinRequest?.status || null,
      level: joinRequest?.level || null,
    });
  } catch (error) {
    console.error('[API] GET /api/tech-groups/:slug/assessment-status - Error:', error);
    res.status(500).json({ error: 'Failed to fetch assessment status' });
  }
});

// GET /api/tech-groups/:slug/assessment/questions - Get assessment questions
app.get('/api/tech-groups/:slug/assessment/questions', authenticateJWT, async (req, res) => {
  try {
    // Normalize slug (lowercase, trim)
    const rawSlug = req.params.slug;
    const normalizedSlug = rawSlug.toLowerCase().trim();
    console.log(`[Assessment] GET /api/tech-groups/${normalizedSlug}/assessment/questions - Request received`);
    console.log(`[Assessment] Raw slug: "${rawSlug}", Normalized: "${normalizedSlug}"`);
    
    if (mongoose.connection.readyState !== 1) {
      console.warn('[Assessment] Database not connected');
      return res.status(200).json({ questions: [], totalQuestions: 0 }); // Return 200 OK with empty array
    }
    
    const { count = 7 } = req.query;
    const questionCount = Math.min(Math.max(parseInt(count, 10) || 7, 5), 10);
    console.log(`[Assessment] Requested count: ${count}, Parsed: ${questionCount}`);
    
    // Find tech group by slug (normalized)
    const group = await findTechGroupBySlug(normalizedSlug);
    if (!group) {
      console.warn(`[Assessment] Tech group not found for slug: ${normalizedSlug}`);
      // Return 200 OK with empty array instead of 404
      return res.status(200).json({ questions: [], totalQuestions: 0, techSkill: null });
    }
    
    console.log(`[Assessment] Found tech group: ${group.name} (groupId: ${group.groupId})`);
    
    // Extract tech skill from group
    const techSkill = extractTechSkillFromGroup(group);
    console.log(`[Assessment] Extracted tech skill: ${techSkill}`);
    
    if (!techSkill) {
      console.warn(`[Assessment] Could not determine tech skill for group: ${group.name}`);
      // Return 200 OK with empty array instead of 400
      return res.status(200).json({ 
        questions: [], 
        totalQuestions: 0, 
        techSkill: null,
        groupName: group.name,
        groupId: group.groupId
      });
    }
    
    // Normalize skill key for database lookup
    const skillKey = techSkill.toLowerCase().replace(/\s+/g, '-');
    const normalizedSkill = skillKey === 'full-stack' || skillKey === 'fullstack' ? 'fullstack' : skillKey;
    console.log(`[Assessment] Normalized skill key: ${normalizedSkill}`);
    
    // Try to fetch from database first (prioritize techGroupId, then techGroupSlug, then techSkill)
    let dbQuestions = await AssessmentQuestion.find({
      $or: [
        { techGroupId: group.groupId, isActive: true }, // Most specific: exact group match
        { techGroupSlug: normalizedSlug, isActive: true }, // Group slug match
        { techSkill: normalizedSkill, isActive: true, techGroupId: { $exists: false } } // Skill-based only if not linked to a specific group
      ]
    }).lean();
    
    console.log(`[Assessment] Found ${dbQuestions.length} questions in database`);
    
    let allQuestions = [];
    
    if (dbQuestions.length > 0) {
      // Use database questions - shuffle options for each question
      dbQuestions.forEach((q) => {
        const options = [...(q.options || [])];
        const correctAnswer = q.correctAnswer;
        // Shuffle options array
        for (let i = options.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [options[i], options[j]] = [options[j], options[i]];
        }
        allQuestions.push({
          question: q.question,
          options,
          correctAnswer,
        });
      });
    } else {
      // Fallback to in-memory ASSESSMENT_QUESTIONS if database is empty
      console.warn(`[Assessment] No questions in DB, falling back to in-memory for ${normalizedSkill}`);
      if (ASSESSMENT_QUESTIONS[normalizedSkill]) {
        Object.values(ASSESSMENT_QUESTIONS[normalizedSkill]).forEach((levelQuestions) => {
          if (Array.isArray(levelQuestions)) {
            levelQuestions.forEach((q) => {
              const options = [...(q.options || [])];
              const correctAnswer = options[0];
              // Shuffle options array
              for (let i = options.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [options[i], options[j]] = [options[j], options[i]];
              }
              allQuestions.push({
                question: q.question,
                options,
                correctAnswer,
              });
            });
          }
        });
      }
    }
    
    console.log(`[Assessment] Total questions available: ${allQuestions.length}`);
    
    if (allQuestions.length === 0) {
      // Return 200 OK with empty array - never 400
      console.warn(`[Assessment] No questions available for skill: ${normalizedSkill}`);
      return res.status(200).json({ 
        questions: [], 
        totalQuestions: 0,
        techSkill: normalizedSkill,
        message: 'No questions available yet for this tech skill'
      });
    }
    
    // Shuffle questions and select N
    const shuffled = allQuestions.sort(() => Math.random() - 0.5);
    const selectedQuestions = shuffled.slice(0, questionCount);
    
    // Prepare questions for client (without correct answers)
    const questionsForClient = selectedQuestions.map((q, idx) => ({
      questionId: `q-${idx + 1}`,
      question: q.question,
      options: q.options || [],
    }));
    
    console.log(`[Assessment] Returning ${questionsForClient.length} questions`);
    
    res.status(200).json({
      questions: questionsForClient,
      techSkill: normalizedSkill,
      totalQuestions: questionsForClient.length,
    });
  } catch (error) {
    console.error('[Assessment] GET /api/tech-groups/:slug/assessment/questions - Error:', error);
    // Return 200 OK with empty array instead of 500
    res.status(200).json({ questions: [], totalQuestions: 0, error: 'Failed to fetch questions' });
  }
});

// POST /api/tech-groups/:slug/assessment/submit - Submit assessment answers
app.post('/api/tech-groups/:slug/assessment/submit', authenticateJWT, async (req, res) => {
  try {
    const { slug } = req.params;
    const { answers, level } = req.body;
    
    console.log('[API] POST /api/tech-groups/:slug/assessment/submit - Request received', {
      slug,
      hasAnswers: !!answers,
      answersCount: answers ? Object.keys(answers).length : 0,
      level,
      userId: req.user?.userId
    });
    
    if (mongoose.connection.readyState !== 1) {
      console.error('[API] Database connection unavailable');
      return res.status(503).json({ error: 'Database connection unavailable' });
    }
    
    if (!answers || typeof answers !== 'object') {
      console.warn('[API] Invalid answers payload:', answers);
      return res.status(400).json({ error: 'Answers are required' });
    }
    
    // Normalize slug
    const normalizedSlug = slug.toLowerCase().trim();
    const group = await findTechGroupBySlug(normalizedSlug);
    if (!group) {
      console.warn(`[API] Tech group not found for slug: ${normalizedSlug}`);
      return res.status(404).json({ error: 'Tech group not found' });
    }
    
    console.log(`[API] Found tech group: ${group.name} (${group.groupId})`);
    
    if (!Array.isArray(group.joinRequests)) {
      group.joinRequests = [];
    }
    
    // Find existing request or create new one
    let request = group.joinRequests.find(req => req.userId === req.user.userId);
    if (!request) {
      request = {
        requestId: generateId(),
        userId: req.user.userId,
        username: req.user.username,
        answers: {},
        level: '',
        status: 'approved',
        createdAt: new Date(),
        updatedAt: new Date(),
        decidedAt: new Date(),
        decidedBy: 'system',
      };
      group.joinRequests.push(request);
    }
    
    // Update request with assessment data
    request.answers = answers;
    if (level) request.level = level;
    request.updatedAt = new Date();
    
    // Auto-approve assessment submissions
    if (request.status === 'pending') {
      request.status = 'approved';
      request.decidedAt = new Date();
      request.decidedBy = 'system';
      
      // Add user to group if not already a member
      if (!group.members.includes(req.user.userId)) {
        group.members.push(req.user.userId);
      }
    }
    
    await group.save();
    
    // Calculate score from answers (if questions are provided)
    // For now, auto-approve means passed
    const passed = request.status === 'approved';
    const score = passed ? 100 : 0; // Default to 100% for auto-approved assessments
    
    console.log(`[API] Assessment submitted successfully for user ${req.user.userId}, group: ${group.name}`);
    
    res.json({
      success: true,
      passed,
      score,
      message: passed 
        ? `Congratulations! You've been added to ${group.name}.` 
        : 'Assessment submitted successfully.',
      request: serializeJoinRequest(request),
      group: serializeGroup(group),
    });
  } catch (error) {
    console.error('[API] POST /api/tech-groups/:slug/assessment/submit - Error:', error);
    res.status(500).json({ error: 'Failed to submit assessment', message: error.message });
  }
});

// ==================== GROUP ASSESSMENT ENDPOINTS (with attempt tracking) ====================

// Get assessment status for a user/group (check attempts, pass status)
app.get('/api/tech-groups/:groupId/assessment/status', authenticateJWT, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({error: 'Database not connected'});
    }

    const {groupId} = req.params;
    const group = await TechGroup.findOne({groupId});
    if (!group) {
      return res.status(404).json({error: 'Tech group not found'});
    }

    // Check if user is already a member
    if (group.members?.includes(req.user.userId)) {
      return res.json({
        status: 'passed',
        isMember: true,
        attempts: [],
        canAttempt: false,
      });
    }

    // Get all attempts for this user/group
    const attempts = await GroupAssessmentAttempt.find({
      userId: req.user.userId,
      groupId,
    }).sort({createdAt: -1});

    const passedAttempt = attempts.find((a) => a.passed);
    const attemptCount = attempts.length;

    if (passedAttempt) {
      return res.json({
        status: 'passed',
        isMember: false,
        attempts: attempts.map((a) => ({
          attemptNumber: a.attemptNumber,
          score: a.score,
          passed: a.passed,
          completedAt: a.completedAt,
        })),
        canAttempt: false,
      });
    }

    if (attemptCount >= 2) {
      return res.json({
        status: 'failed',
        isMember: false,
        attempts: attempts.map((a) => ({
          attemptNumber: a.attemptNumber,
          score: a.score,
          passed: a.passed,
          completedAt: a.completedAt,
        })),
        canAttempt: false,
        message: 'Maximum attempts reached. Please enroll in live classes to improve your skills.',
      });
    }

    return res.json({
      status: 'pending',
      isMember: false,
      attempts: attempts.map((a) => ({
        attemptNumber: a.attemptNumber,
        score: a.score,
        passed: a.passed,
        completedAt: a.completedAt,
      })),
      canAttempt: true,
      nextAttemptNumber: attemptCount + 1,
    });
  } catch (error) {
    console.error('Get assessment status error:', error);
    res.status(500).json({error: 'Failed to fetch assessment status'});
  }
});

// Get randomized questions for assessment
app.get('/api/tech-groups/:groupId/assessment/questions', authenticateJWT, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({error: 'Database not connected'});
    }

    const {groupId} = req.params;
    const {count = 7} = req.query;
    // Allow count between 5-10, default to 7 if invalid
    const parsedCount = parseInt(count, 10);
    const questionCount = parsedCount && parsedCount >= 5 && parsedCount <= 10 
      ? parsedCount 
      : (parsedCount && parsedCount > 0 && parsedCount < 5 ? 5 : 7);

    const group = await TechGroup.findOne({groupId});
    if (!group) {
      console.error(`[Assessment] Group not found: ${groupId}`);
      return res.status(404).json({error: 'Tech group not found'});
    }

    console.log(`[Assessment] Found group: ${group.name} (groupId: ${groupId})`);
    console.log(`[Assessment] Group topics:`, group.topics);

    // Check attempt status first
    const attempts = await GroupAssessmentAttempt.find({
      userId: req.user.userId,
      groupId,
    });

    if (attempts.length >= 2) {
      const passedAttempt = attempts.find((a) => a.passed);
      if (!passedAttempt) {
        return res.status(403).json({
          error: 'Maximum attempts reached',
          message: 'You have reached the maximum number of attempts. Please enroll in live classes.',
        });
      }
    }

    // Extract tech skill from group name or topics
    const techSkill = extractTechSkillFromGroup(group);
    console.log(`[Assessment] Extracted tech skill: ${techSkill} for group ${group.name}`);
    if (!techSkill) {
      console.error(`[Assessment] Could not determine tech skill for group: ${group.name}, topics: ${group.topics}`);
      // Return more helpful error message
      return res.status(400).json({
        error: 'Could not determine tech skill for this group',
        groupName: group.name,
        groupId: group.groupId,
        topics: group.topics
      });
    }

    // Get questions from ASSESSMENT_QUESTIONS
    const skillKey = techSkill.toLowerCase().replace(/\s+/g, '-');
    const normalizedSkill = skillKey === 'full-stack' || skillKey === 'fullstack' ? 'fullstack' : skillKey;
    
    // Get questions from all levels and randomize
    const allQuestions = [];
    if (ASSESSMENT_QUESTIONS[normalizedSkill]) {
      Object.values(ASSESSMENT_QUESTIONS[normalizedSkill]).forEach((levelQuestions) => {
        if (Array.isArray(levelQuestions)) {
          levelQuestions.forEach((q) => {
            // Shuffle options but remember the correct answer (first option)
            const options = [...(q.options || [])];
            const correctAnswer = options[0];
            // Shuffle options array
            for (let i = options.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [options[i], options[j]] = [options[j], options[i]];
            }
            
            allQuestions.push({
              question: q.question,
              options,
              correctAnswer, // Store correct answer server-side
            });
          });
        }
      });
    }

    if (allQuestions.length === 0) {
      return res.status(404).json({error: 'No questions available for this tech skill'});
    }

    // Shuffle questions and select N
    const shuffled = allQuestions.sort(() => Math.random() - 0.5);
    const selectedQuestions = shuffled.slice(0, questionCount);
    
    // Initialize app.locals if not exists
    if (!req.app.locals.assessmentAnswers) {
      req.app.locals.assessmentAnswers = new Map();
    }
    
    // Prepare questions for client (without correct answers)
    const questionsForClient = selectedQuestions.map((q, idx) => ({
      questionId: `q-${idx + 1}`,
      question: q.question,
      options: q.options || [],
    }));

    // Store correct answers in server-side map keyed by groupId:userId:questionId
    selectedQuestions.forEach((q, idx) => {
      const storageKey = `${groupId}:${req.user.userId}:q-${idx + 1}`;
      req.app.locals.assessmentAnswers.set(storageKey, q.correctAnswer);
    });

    res.json({
      questions: questionsForClient,
      techSkill,
      totalQuestions: questionsForClient.length,
    });
  } catch (error) {
    console.error('Get assessment questions error:', error);
    res.status(500).json({error: 'Failed to fetch assessment questions'});
  }
});

// Submit assessment answers
app.post('/api/tech-groups/:groupId/assessment/submit', authenticateJWT, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({error: 'Database not connected'});
    }

    const {groupId} = req.params;
    const {answers, questions} = req.body; // answers: {questionId: selectedAnswer}, questions: original questions array

    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({error: 'Answers are required'});
    }

    const group = await TechGroup.findOne({groupId});
    if (!group) {
      return res.status(404).json({error: 'Tech group not found'});
    }

    // Check if user is already a member
    if (group.members?.includes(req.user.userId)) {
      return res.json({
        success: true,
        passed: true,
        score: 100,
        message: 'You are already a member of this group',
        isMember: true,
      });
    }

    // Check existing attempts
    const existingAttempts = await GroupAssessmentAttempt.find({
      userId: req.user.userId,
      groupId,
    }).sort({createdAt: -1});

    if (existingAttempts.length >= 2) {
      const passedAttempt = existingAttempts.find((a) => a.passed);
      if (!passedAttempt) {
        return res.status(403).json({
          error: 'Maximum attempts reached',
          message: 'You have reached the maximum number of attempts. Please enroll in live classes to improve your skills.',
          attempts: existingAttempts.map((a) => ({
            attemptNumber: a.attemptNumber,
            score: a.score,
            passed: a.passed,
          })),
        });
      }
    }

    const nextAttemptNumber = existingAttempts.length + 1;

    // Score the assessment
    if (!questions || !Array.isArray(questions)) {
      return res.status(400).json({error: 'Questions array is required for scoring'});
    }

    // Retrieve correct answers from server-side storage
    // Initialize if not exists
    if (!req.app.locals.assessmentAnswers) {
      req.app.locals.assessmentAnswers = new Map();
    }
    const answerMap = req.app.locals.assessmentAnswers;
    
    let correctCount = 0;
    const questionResults = questions.map((q) => {
      const selectedAnswer = answers[q.questionId];
      
      // Get correct answer from server-side storage
      const storageKey = `${groupId}:${req.user.userId}:${q.questionId}`;
      let correctAnswer = answerMap.get(storageKey) || '';
      
      // Fallback: try to find correct answer by matching question text in ASSESSMENT_QUESTIONS
      if (!correctAnswer) {
        const techSkill = extractTechSkillFromGroup(group);
        const skillKey = techSkill?.toLowerCase().replace(/\s+/g, '-') || '';
        const normalizedSkill = skillKey === 'full-stack' || skillKey === 'fullstack' ? 'fullstack' : skillKey;
        
        if (ASSESSMENT_QUESTIONS[normalizedSkill]) {
          for (const levelQuestions of Object.values(ASSESSMENT_QUESTIONS[normalizedSkill])) {
            if (Array.isArray(levelQuestions)) {
              const matched = levelQuestions.find((aq) => aq.question === q.question);
              if (matched && matched.options && matched.options.length > 0) {
                correctAnswer = matched.options[0]; // First option is correct
                break;
              }
            }
          }
        }
      }
      
      // Clean up stored answer after use
      answerMap.delete(storageKey);
      
      const isCorrect = selectedAnswer === correctAnswer;
      if (isCorrect) correctCount++;
      return {
        questionId: q.questionId,
        question: q.question,
        selectedAnswer: selectedAnswer || '',
        correctAnswer,
        isCorrect,
      };
    });

    const totalQuestions = questions.length;
    const score = Math.round((correctCount / totalQuestions) * 100);
    const passed = score >= 20; // Minimum 20% to pass

    // Extract tech skill
    const techSkill = extractTechSkillFromGroup(group);

    // Save attempt
    const attempt = new GroupAssessmentAttempt({
      attemptId: generateId(),
      userId: req.user.userId,
      groupId,
      techSkill: techSkill || 'unknown',
      attemptNumber: nextAttemptNumber,
      questions: questionResults,
      score,
      passed,
      completedAt: new Date(),
    });
    await attempt.save();

    if (passed) {
      // Add user to group
      if (!group.members.includes(req.user.userId)) {
        group.members.push(req.user.userId);
      }

      // Create join request record
      if (!Array.isArray(group.joinRequests)) {
        group.joinRequests = [];
      }
      const joinRequest = {
        requestId: generateId(),
        userId: req.user.userId,
        username: req.user.username,
        answers: answers,
        level: 'assessed',
        status: 'approved',
        createdAt: new Date(),
        updatedAt: new Date(),
        decidedAt: new Date(),
        decidedBy: 'system',
      };
      group.joinRequests.push(joinRequest);

      // Add welcome message
      if (!Array.isArray(group.messages)) {
        group.messages = [];
      }
      group.messages.push({
        messageId: generateId(),
        groupId,
        userId: 'system',
        username: 'Announcements',
        message: `🎉 **${req.user.username}** just joined ${group.name} after passing the skill assessment!`,
        attachments: [],
        voiceNote: null,
        timestamp: new Date(),
        reactions: {},
        readBy: [],
      });

      await group.save();

      const io = req.app.get('io');
      if (io) {
        io.to(`group:${groupId}`).emit('group:joined', {groupId, userId: req.user.userId});
      }
    }

    res.json({
      success: true,
      passed,
      score,
      correctCount,
      totalQuestions,
      attemptNumber: nextAttemptNumber,
      message: passed
        ? 'Congratulations! You passed the assessment and have been added to the group.'
        : nextAttemptNumber < 2
          ? `You scored ${score}%. You need at least 20% to pass. You have one more attempt.`
          : 'You have reached the maximum number of attempts. Please enroll in live classes to improve your skills.',
      canRetry: !passed && nextAttemptNumber < 2,
      maxAttemptsReached: nextAttemptNumber >= 2 && !passed,
    });
  } catch (error) {
    console.error('Submit assessment error:', error);
    res.status(500).json({error: 'Failed to submit assessment'});
  }
});

// Helper function to extract tech skill from group
const extractTechSkillFromGroup = (group) => {
  if (!group) return null;
  
  // Check topics first
  if (Array.isArray(group.topics) && group.topics.length > 0) {
    const skillTopics = ['Frontend', 'Backend', 'Fullstack', 'Mobile', 'AI/ML', 'Data Science', 'Cybersecurity', 'Cloud', 'DevOps', 'UI/UX'];
    for (const topic of group.topics) {
      const matched = skillTopics.find((skill) => topic.toLowerCase().includes(skill.toLowerCase()));
      if (matched) return matched;
    }
  }
  
  // Check group name and groupId
  const name = (group.name || '').toLowerCase();
  const groupIdLower = (group.groupId || '').toLowerCase();
  const combined = `${name} ${groupIdLower}`.toLowerCase();
  
  const skillMap = {
    frontend: 'Frontend',
    backend: 'Backend',
    'api': 'Backend', // API groups are typically backend
    'artisans': 'Backend', // API Artisans -> Backend
    fullstack: 'Fullstack',
    'full-stack': 'Fullstack',
    mobile: 'Mobile',
    'ai/ml': 'AI/ML',
    'ai': 'AI/ML',
    'ml': 'AI/ML',
    'machine learning': 'AI/ML',
    'data science': 'Data Science',
    'data-science': 'Data Science',
    cybersecurity: 'Cybersecurity',
    'cyber': 'Cybersecurity',
    cloud: 'Cloud',
    devops: 'DevOps',
    'ui/ux': 'UI/UX',
    'ui': 'UI/UX',
    'ux': 'UI/UX',
    'performance': 'UI/UX', // UI Performance -> UI/UX
  };
  
  // Check combined string (name + groupId)
  for (const [key, value] of Object.entries(skillMap)) {
    if (combined.includes(key)) return value;
  }
  
  // Check name separately
  for (const [key, value] of Object.entries(skillMap)) {
    if (name.includes(key)) return value;
  }
  
  // Check groupId separately
  for (const [key, value] of Object.entries(skillMap)) {
    if (groupIdLower.includes(key)) return value;
  }
  
  return 'Fullstack'; // Default fallback
};

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
    // Check MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ 
        error: 'Database connection unavailable',
        message: 'MongoDB is not connected. Please try again in a moment.'
      });
    }
    
    const { groupId } = req.params;
    if (!groupId || groupId.trim() === '') {
      return res.status(400).json({ error: 'Group ID is required' });
    }
    
    const group = await TechGroup.findOne({ groupId: groupId.trim() });
    if (!group) {
      return res.status(404).json({ error: 'Tech group not found' });
    }
    res.json(serializeGroup(group));
  } catch (error) {
    console.error('Get tech group error:', error);
    res.status(500).json({ error: 'Failed to fetch tech group', details: error.message });
  }
});

app.patch('/api/tech-groups/:groupId', authenticateJWT, async (req, res) => {
  try {
    // Check MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ 
        error: 'Database connection unavailable',
        message: 'MongoDB is not connected. Please try again in a moment.'
      });
    }
    
    const { groupId } = req.params;
    if (!groupId || groupId.trim() === '') {
      return res.status(400).json({ error: 'Group ID is required' });
    }
    
    const { name, description, topics } = req.body;

    const group = await TechGroup.findOne({ groupId: groupId.trim() });
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
    // Check MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ 
        error: 'Database connection unavailable',
        message: 'MongoDB is not connected. Please try again in a moment.'
      });
    }
    
    const { groupId } = req.params;
    if (!groupId || groupId.trim() === '') {
      return res.status(400).json({ error: 'Group ID is required' });
    }
    
    const group = await TechGroup.findOne({ groupId: groupId.trim() });
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

// GET /api/admin/analytics - Get admin analytics
app.get('/api/admin/analytics', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: 'Database connection unavailable' });
    }
    
    // Total users
    const totalUsers = await User.countDocuments({ status: { $ne: 'deleted' } });
    
    // Active users (online or seen in last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activeUsers = await User.countDocuments({
      $or: [
        { online: true },
        { lastSeen: { $gte: oneDayAgo } }
      ],
      status: { $ne: 'deleted' }
    });
    
    // New signups
    const now = new Date();
    const daily = await User.countDocuments({
      createdAt: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
    });
    const weekly = await User.countDocuments({
      createdAt: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) }
    });
    const monthly = await User.countDocuments({
      createdAt: { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) }
    });
    
    // Active sessions (users currently online)
    const activeSessions = await User.countDocuments({ online: true });
    
    // Assessment completion rate (using GroupAssessmentAttempt)
    const totalAssessments = await GroupAssessmentAttempt?.countDocuments() || 0;
    const completedAssessments = await GroupAssessmentAttempt?.countDocuments({ completed: true }) || 0;
    const assessmentCompletionRate = totalAssessments > 0 
      ? Math.round((completedAssessments / totalAssessments) * 100) 
      : 0;
    
    // Class attendance (placeholder - would need Classroom model)
    const classAttendance = 0; // TODO: Implement when Classroom model exists
    
    // Group participation (users in tech groups)
    const techGroups = await TechGroup.find({});
    const groupParticipation = techGroups.reduce((total, group) => {
      return total + (Array.isArray(group.members) ? group.members.length : 0);
    }, 0);
    
    // Role distribution
    const roleDistribution = {
      admin: await User.countDocuments({ role: { $in: ['admin', 'superadmin'] }, status: { $ne: 'deleted' } }),
      user: await User.countDocuments({ role: 'user', status: { $ne: 'deleted' } }),
      instructor: await User.countDocuments({ role: 'instructor', status: { $ne: 'deleted' } })
    };
    
    // Growth data (last 30 days)
    const growthData = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const startOfDay = new Date(date.setHours(0, 0, 0, 0));
      const endOfDay = new Date(date.setHours(23, 59, 59, 999));
      const usersOnDay = await User.countDocuments({
        createdAt: { $gte: startOfDay, $lte: endOfDay }
      });
      growthData.push({
        date: startOfDay.toISOString().split('T')[0],
        users: usersOnDay
      });
    }
    
    res.json({
      totalUsers,
      activeUsers,
      newSignups: { daily, weekly, monthly },
      activeSessions,
      assessmentCompletionRate,
      classAttendance,
      groupParticipation,
      roleDistribution,
      growthData
    });
  } catch (error) {
    console.error('[API] GET /api/admin/analytics - Error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

app.get('/api/admin/users', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const users = await User.find({ status: { $ne: 'deleted' } }, { password: 0 }).sort({ createdAt: -1 });
    res.json(
      users.map((user) => ({
        _id: user._id,
        userId: user.userId,
        username: user.username,
        email: user.email || '',
        role: user.role,
        status: user.status,
        online: user.online || false,
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

// Update user endpoint
app.put('/api/admin/users/:userId', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { username, email, role, status } = req.body;
    
    const targetUser = await User.findOne({ userId });
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Prevent modifying superadmin unless current user is superadmin
    if (targetUser.role === 'superadmin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Cannot modify superadmin' });
    }
    
    // Prevent changing role to superadmin unless current user is superadmin
    if (role === 'superadmin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Cannot assign superadmin role' });
    }
    
    if (username) targetUser.username = username;
    if (email) targetUser.email = email;
    if (role && ['user', 'admin', 'instructor', 'superadmin'].includes(role)) {
      targetUser.role = role;
    }
    if (status && ['active', 'suspended'].includes(status)) {
      targetUser.status = status;
      if (status === 'suspended') {
        targetUser.suspendedAt = new Date();
      } else {
        targetUser.suspendedAt = null;
      }
    }
    
    await targetUser.save();
    
    await createAdminLog({
      adminId: req.user.userId,
      adminUsername: req.currentUser?.username || req.user.username || 'admin',
      action: 'update',
      targetUserId: targetUser.userId,
      targetUsername: targetUser.username,
      details: `Updated: ${JSON.stringify({ username, email, role, status })}`,
    });
    
    res.json({
      success: true,
      user: {
        userId: targetUser.userId,
        username: targetUser.username,
        email: targetUser.email,
        role: targetUser.role,
        status: targetUser.status,
      }
    });
  } catch (error) {
    console.error('Admin update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
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

// POST /api/admin/users - Create new user (admin only)
app.post('/api/admin/users', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const { username, email, password, role = 'user' } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ username }, { email }]
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User with this username or email already exists' });
    }

    // Validate role
    if (!['user', 'instructor', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Prevent creating superadmin unless current user is superadmin
    if (role === 'superadmin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Cannot create superadmin' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = new User({
      userId: generateId(),
      username,
      email,
      password: hashedPassword,
      role,
      status: 'active',
      createdAt: new Date(),
    });

    await newUser.save();

    await createAdminLog({
      adminId: req.user.userId,
      adminUsername: req.currentUser?.username || req.user.username || 'admin',
      action: 'create',
      targetUserId: newUser.userId,
      targetUsername: newUser.username,
      details: `Created user with role: ${role}`,
    });

    res.status(201).json({
      success: true,
      user: {
        userId: newUser.userId,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        status: newUser.status,
      }
    });
  } catch (error) {
    console.error('Admin create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

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

// Admin classes endpoint (placeholder)
app.get('/api/admin/classes', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    // TODO: Implement when Classroom model exists
    res.json([]);
  } catch (error) {
    console.error('Admin fetch classes error:', error);
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

// Admin approvals endpoint
app.get('/api/admin/approvals', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const approvals = [];
    
    // Get pending classroom requests
    const techGroups = await TechGroup.find({});
    for (const group of techGroups) {
      if (Array.isArray(group.joinRequests)) {
        const pending = group.joinRequests.filter(r => r.status === 'pending');
        for (const request of pending) {
          const user = await User.findOne({ userId: request.userId }, { username: 1, email: 1 });
          approvals.push({
            id: request.requestId,
            type: 'classroom-request',
            groupId: group.groupId,
            groupName: group.name,
            userId: request.userId,
            username: user?.username || 'Unknown',
            email: user?.email || '',
            status: request.status,
            createdAt: request.createdAt,
          });
        }
      }
    }
    
    res.json(approvals);
  } catch (error) {
    console.error('Admin fetch approvals error:', error);
    res.status(500).json({ error: 'Failed to fetch approvals' });
  }
});

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

// Socket.io connection handling with comprehensive error handling
io.on('connection', (socket) => {
  console.log('[Socket.IO] User connected:', socket.id);
  
  // Wrap all socket handlers to prevent crashes
  socket.on('error', (error) => {
    console.error('[Socket.IO] Socket error:', error);
    // Don't disconnect or throw, just log
  });
  
  socket.on('user:join', async ({ userId, username }) => {
    socket.userId = userId;
    socket.username = username;
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
      console.error('[Socket.IO] User join error:', error);
      // Gracefully handle error - don't disconnect socket
      socket.emit('error', { message: 'Failed to join user session' });
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
      console.error('[Socket.IO] Tech group join error:', error);
      // Don't crash, just log
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
      console.error('[Socket.IO] Tech group create error:', error);
      socket.emit('error', { message: 'Failed to create group' });
    }
  });
  
  socket.on('group:message', async ({ groupId, userId, username, message = '', attachments = [], voiceNote = null, messageId, timestamp, reactions = {}, type = 'text' }) => {
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

        // Determine message type if not provided
        let messageType = type;
        if (!messageType || !['text', 'emoji', 'image', 'file', 'audio'].includes(messageType)) {
          if (voiceNote && voiceNote.url) {
            messageType = 'audio';
          } else if (attachments && attachments.length > 0) {
            const firstAttachment = attachments[0];
            if (firstAttachment.type && firstAttachment.type.startsWith('image/')) {
              messageType = 'image';
            } else if (firstAttachment.type && firstAttachment.type.startsWith('audio/')) {
              messageType = 'audio';
            } else {
              messageType = 'file';
            }
          } else if (message.trim().match(/^[\p{Emoji}\s]+$/u)) {
            messageType = 'emoji';
          } else {
            messageType = 'text';
          }
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
          type: messageType,
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
      console.error('[Socket.IO] Tech group message error:', error);
      // Don't crash, just log
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
      console.error('[Socket.IO] Private chat start error:', error);
      // Don't crash, just log
    }
  });
  
  // ========== PRIVATE CIRCLE SOCKET HANDLERS ==========
  socket.on('circle:join', async ({ circleId, userId }) => {
    try {
      const circle = await PrivateCircle.findOne({ circleId });
      if (circle) {
        const isMember = circle.members.some((m) => m.userId === userId);
        if (!isMember) {
          socket.emit('error', { message: 'You are not a member of this circle' });
          return;
        }
        socket.join(`circle:${circleId}`);
        socket.emit('circle:messages', filterActiveMessages(circle.messages || []));
      }
    } catch (error) {
      console.error('[Socket.IO] Private circle join error:', error);
      socket.emit('error', { message: 'Failed to join circle' });
    }
  });

  socket.on('circle:message', async ({ circleId, userId, username, message = '', attachments = [], voiceNote = null, messageId, timestamp, reactions = {}, type = 'text' }) => {
    try {
      const circle = await PrivateCircle.findOne({ circleId });
      if (!circle) {
        socket.emit('error', { message: 'Circle not found' });
        return;
      }

      // Verify user is a member
      const isMember = circle.members.some((m) => m.userId === userId);
      if (!isMember) {
        socket.emit('error', { message: 'You are not a member of this circle' });
        return;
      }

      const bannedWord = containsBannedWord(message || '');
      if (bannedWord) {
        await flagMessageViolation({
          userId,
          username,
          messageId,
          circleId,
          offendingContent: message,
          triggerWord: bannedWord,
        });
        return;
      }

      // Determine message type if not provided
      let messageType = type;
      if (!messageType || !['text', 'emoji', 'image', 'file', 'audio'].includes(messageType)) {
        if (voiceNote && voiceNote.url) {
          messageType = 'audio';
        } else if (attachments && attachments.length > 0) {
          const firstAttachment = attachments[0];
          if (firstAttachment.type && firstAttachment.type.startsWith('image/')) {
            messageType = 'image';
          } else if (firstAttachment.type && firstAttachment.type.startsWith('audio/')) {
            messageType = 'audio';
          } else {
            messageType = 'file';
          }
        } else if (message.trim().match(/^[\p{Emoji}\s]+$/u)) {
          messageType = 'emoji';
        } else {
          messageType = 'text';
        }
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
        senderId: userId,
        username,
        type: messageType,
        message,
        attachments: sanitizedAttachments,
        voiceNote: sanitizedVoiceNote,
        timestamp: timestamp || new Date(),
        reactions,
        readBy: [userId],
      };

      circle.messages.push(messageData);
      await circle.save();

      io.to(`circle:${circleId}`).emit('circle:message', {
        ...messageData,
        timestamp: messageData.timestamp.toISOString(),
      });
    } catch (error) {
      console.error('[Socket.IO] Private circle message error:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  socket.on('private:message', async ({ userId, targetUserId, message = '', attachments = [], voiceNote = null, username, messageId, timestamp, reactions = {}, type = 'text' }) => {
    try {
      // Enforce friend-only messaging: verify friendship exists and is accepted
      const friendship = await Friendship.findOne({
        $or: [
          { requesterId: userId, recipientId: targetUserId },
          { requesterId: targetUserId, recipientId: userId }
        ],
        status: 'accepted',
      });

      if (!friendship) {
        console.warn(`[Socket.IO] Private message blocked: Users ${userId} and ${targetUserId} are not friends`);
        socket.emit('error', { message: 'You can only message accepted friends' });
        return;
      }

      const chatId = getChatId(userId, targetUserId);
      
      // Ensure private conversation exists
      let privateConv = await PrivateConversation.findOne({ conversationId: chatId });
      if (!privateConv) {
        // Create private conversation linked to friendship
        privateConv = await createPrivateConversation(userId, targetUserId, friendship._id);
      }
      
      let chat = await PrivateChat.findOne({ chatId });
      if (!chat) {
        chat = new PrivateChat({
          chatId,
          participants: [userId, targetUserId],
          messages: []
        });
      }
      
      // Determine message type if not provided
      let messageType = type;
      if (!messageType || !['text', 'emoji', 'image', 'file', 'audio'].includes(messageType)) {
        if (voiceNote && voiceNote.url) {
          messageType = 'audio';
        } else if (attachments && attachments.length > 0) {
          const firstAttachment = attachments[0];
          if (firstAttachment.type && firstAttachment.type.startsWith('image/')) {
            messageType = 'image';
          } else if (firstAttachment.type && firstAttachment.type.startsWith('audio/')) {
            messageType = 'audio';
          } else {
            messageType = 'file';
          }
        } else if (message.trim().match(/^[\p{Emoji}\s]+$/u)) {
          messageType = 'emoji';
        } else {
          messageType = 'text';
        }
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
        type: messageType,
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
      console.error('[Socket.IO] Private message error:', error);
      // Don't crash, just log
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
      console.error('[Socket.IO] Message read error:', error);
      // Don't crash, just log
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
      console.error('[Socket.IO] Message react error:', error);
      // Don't crash, just log
    }
  });
  
  // Live Session Room handlers
  socket.on('room:join', async ({roomId}) => {
    try {
      if (!roomId) return;
      socket.join(`room:${roomId}`);
      io.to(`room:${roomId}`).emit('room:user:joined', {
        roomId,
        userId: socket.userId || 'unknown',
        username: socket.username || 'Unknown',
      });
    } catch (error) {
      console.error('Room join error:', error);
    }
  });

  socket.on('room:leave', async ({roomId}) => {
    try {
      if (!roomId) return;
      socket.leave(`room:${roomId}`);
      io.to(`room:${roomId}`).emit('room:user:left', {
        roomId,
        userId: socket.userId || 'unknown',
        username: socket.username || 'Unknown',
      });
    } catch (error) {
      console.error('Room leave error:', error);
    }
  });

  socket.on('room:message', async ({roomId, message}) => {
    try {
      if (!roomId || !message) return;
      io.to(`room:${roomId}`).emit('room:message', message);
    } catch (error) {
      console.error('Room message error:', error);
    }
  });

  socket.on('room:typing', async ({roomId, userId, username}) => {
    try {
      if (!roomId) return;
      socket.to(`room:${roomId}`).emit('room:typing', {userId, username});
    } catch (error) {
      console.error('Room typing error:', error);
    }
  });

  socket.on('disconnect', async () => {
    console.log('[Socket.IO] User disconnected:', socket.id);
    
    // Find user by socket ID and mark offline
    try {
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
            console.error('[Socket.IO] Disconnect error (user update):', error);
          }
          break;
        }
      }
    } catch (error) {
      console.error('[Socket.IO] Disconnect error (general):', error);
    }
  });
});

// ============================================
// COMPLETE CRUD OPERATIONS FOR ALL MODELS
// ============================================

// ========== USER CRUD ==========
// GET /api/users/me - Get current user profile
app.get('/api/users/me', authenticateJWT, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ 
        error: 'Database connection unavailable',
        message: 'MongoDB is not connected. Please try again in a moment.'
      });
    }
    
    const user = await User.findOne({ userId: req.user.userId }, { password: 0 });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Serialize user data
    const userData = user.toObject();
    res.json(userData);
  } catch (error) {
    console.error('[API] GET /api/users/me - Error:', error);
    res.status(500).json({ error: 'Failed to fetch user profile', details: error.message });
  }
});

// PATCH /api/users/me - Update current user profile
app.patch('/api/users/me', authenticateJWT, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ 
        error: 'Database connection unavailable',
        message: 'MongoDB is not connected. Please try again in a moment.'
      });
    }
    
    const user = await User.findOne({ userId: req.user.userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Allowed fields for update (only include fields that exist in User schema)
    // Note: bio and socialLinks may not exist in schema - will be stored in onboardingAnswers if needed
    const allowedUpdates = ['username', 'email', 'avatar', 'skills', 'skillLevel', 'onboardingAnswers'];
    const updates = Object.keys(req.body).filter(key => allowedUpdates.includes(key));
    
    // Handle bio and socialLinks specially - store in onboardingAnswers if they don't exist as schema fields
    if (req.body.bio !== undefined) {
      if (!user.onboardingAnswers) user.onboardingAnswers = {};
      user.onboardingAnswers.bio = req.body.bio;
    }
    if (req.body.socialLinks !== undefined) {
      if (!user.onboardingAnswers) user.onboardingAnswers = {};
      user.onboardingAnswers.socialLinks = req.body.socialLinks;
    }
    
    updates.forEach(update => {
      user[update] = req.body[update];
    });
    
    await user.save();
    
    // Return updated user without password
    const userData = user.toObject();
    delete userData.password;
    res.json(userData);
  } catch (error) {
    console.error('[API] PATCH /api/users/me - Error:', error);
    res.status(500).json({ error: 'Failed to update user profile', details: error.message });
  }
});

// GET /api/users/:userId - Get single user
app.get('/api/users/:userId', async (req, res) => {
  try {
    // Check MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ 
        error: 'Database connection unavailable',
        message: 'MongoDB is not connected. Please try again in a moment.'
      });
    }
    
    const { userId } = req.params;
    if (!userId || userId.trim() === '') {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const user = await User.findOne({ userId: userId.trim() }, { password: 0 });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user', details: error.message });
  }
});

// PUT /api/users/:userId - Update user (admin or self)
app.put('/api/users/:userId', authenticateJWT, async (req, res) => {
  try {
    // Check MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ 
        error: 'Database connection unavailable',
        message: 'MongoDB is not connected. Please try again in a moment.'
      });
    }
    
    const { userId } = req.params;
    if (!userId || userId.trim() === '') {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Users can only update themselves unless they're admin
    if (req.user.userId !== userId && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'You can only update your own profile' });
    }
    
    const user = await User.findOne({ userId: userId.trim() });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const allowedUpdates = ['username', 'email', 'avatar', 'skills', 'skillLevel', 'onboardingAnswers'];
    const updates = Object.keys(req.body).filter(key => allowedUpdates.includes(key));
    
    updates.forEach(update => {
      user[update] = req.body[update];
    });
    
    // Handle bio and socialLinks specially - store in onboardingAnswers if they don't exist as schema fields
    if (req.body.bio !== undefined) {
      if (!user.onboardingAnswers) user.onboardingAnswers = {};
      user.onboardingAnswers.bio = req.body.bio;
    }
    if (req.body.socialLinks !== undefined) {
      if (!user.onboardingAnswers) user.onboardingAnswers = {};
      user.onboardingAnswers.socialLinks = req.body.socialLinks;
    }
    
    await user.save();
    const { password, ...userWithoutPassword } = user.toObject();
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE /api/users/:userId - Delete user (soft delete)
app.delete('/api/users/:userId', authenticateJWT, async (req, res) => {
  try {
    // Check MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ 
        error: 'Database connection unavailable',
        message: 'MongoDB is not connected. Please try again in a moment.'
      });
    }
    
    const { userId } = req.params;
    if (!userId || userId.trim() === '') {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Only admins or the user themselves can delete
    if (req.user.userId !== userId && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const user = await User.findOne({ userId: userId.trim() });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    user.status = 'deleted';
    user.deletedAt = new Date();
    user.online = false;
    await user.save();
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user', details: error.message });
  }
});

// ========== PRIVATE CHAT CRUD ==========
// GET /api/conversations - Get all conversations
// Query params: 
//   ?type=friend - friend-only conversations
//   ?type=community - community/group conversations only
//   ?type=private-circle - private circle/team conversations only
app.get('/api/conversations', authenticateJWT, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      console.warn('[API] GET /api/conversations - Database not connected, returning empty array');
      return res.json([]);
    }

    const userId = req.user.userId;
    const { type } = req.query; // 'friend', 'community', or 'private-circle'
    const conversations = [];

    // If type=friend, only return friend conversations
    if (type === 'friend') {
      // Get private conversations (friend-only)
      const privateConversations = await PrivateConversation.find({
        participants: userId,
        type: 'friend',
      })
        .populate('friendshipId')
        .sort({ updatedAt: -1 });

      for (const conv of privateConversations) {
        // Verify friendship is accepted
        const friendship = await Friendship.findById(conv.friendshipId);
        if (!friendship || friendship.status !== 'accepted') {
          continue; // Skip if friendship not accepted
        }

        // Get the other participant's info
        const otherParticipantId = conv.participants.find((id) => id !== userId);
        let title = 'Friend';
        let otherUserData = null;
        if (otherParticipantId) {
          const otherUser = await User.findOne(
            { userId: otherParticipantId },
            { username: 1, online: 1, lastSeen: 1 }
          );
          if (otherUser) {
            title = otherUser.username;
            otherUserData = {
              userId: otherUser.userId,
              username: otherUser.username,
              online: otherUser.online || false,
              lastSeen: otherUser.lastSeen,
            };
          }
        }

        // Get messages from PrivateChat (legacy) or create empty
        const privateChat = await PrivateChat.findOne({ chatId: conv.conversationId });
        const activeMessages = privateChat ? filterActiveMessages(privateChat.messages || []) : [];
        const lastMessage =
          activeMessages.length > 0
            ? activeMessages.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))[0]
            : null;

        const unreadCount = activeMessages.filter(
          (msg) => msg.userId !== userId && (!msg.readBy || !msg.readBy.includes(userId))
        ).length;

        conversations.push({
          _id: conv.conversationId,
          type: 'dm',
          conversationType: 'friend',
          title,
          participants: conv.participants,
          otherParticipant: otherUserData,
          lastMessage: lastMessage
            ? {
                content: lastMessage.message || '',
                senderId: lastMessage.userId,
                senderName: lastMessage.username,
                timestamp: lastMessage.timestamp,
              }
            : null,
          unreadCount,
          pinnedBy: [],
          archivedBy: [],
          locked: false,
          updatedAt: conv.updatedAt ? conv.updatedAt.toISOString() : conv.createdAt.toISOString(),
        });
      }

      console.log(`[API] GET /api/conversations?type=friend - Returning ${conversations.length} friend conversations`);
      return res.json(conversations);
    }

    // Get private chats (DM conversations) - legacy support
    const privateChats = await PrivateChat.find({
      participants: userId,
    }).sort({ updatedAt: -1 });

    for (const chat of privateChats) {
      // Get the other participant's info for DM title
      const otherParticipantId = chat.participants.find(id => id !== userId);
      let title = 'Private conversation';
      let otherUserData = null;
      if (otherParticipantId) {
        const otherUser = await User.findOne({ userId: otherParticipantId }, { username: 1, online: 1, lastSeen: 1 });
        if (otherUser) {
          title = otherUser.username;
          otherUserData = {
            userId: otherUser.userId,
            username: otherUser.username,
            online: otherUser.online || false,
            lastSeen: otherUser.lastSeen,
          };
        }
      }

      // Get last message
      const activeMessages = filterActiveMessages(chat.messages || []);
      const lastMessage = activeMessages.length > 0 
        ? activeMessages.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))[0]
        : null;

      // Calculate unread count
      const unreadCount = activeMessages.filter(msg => 
        msg.userId !== userId && 
        (!msg.readBy || !msg.readBy.includes(userId))
      ).length;

      conversations.push({
        _id: chat.chatId,
        type: 'dm',
        conversationType: 'friend',
        title,
        participants: chat.participants,
        otherParticipant: otherUserData,
        lastMessage: lastMessage ? {
          content: lastMessage.message || '',
          senderId: lastMessage.userId,
          senderName: lastMessage.username,
          timestamp: lastMessage.timestamp,
        } : null,
        unreadCount,
        pinnedBy: [],
        archivedBy: [],
        locked: false,
        updatedAt: chat.updatedAt ? chat.updatedAt.toISOString() : chat.createdAt.toISOString()
      });
    }

    // Get tech groups where user is a member (community conversations)
    // Only include if type is 'community' or not specified (backward compatibility)
    if (type === 'community' || !type) {
      const techGroups = await TechGroup.find({
        members: userId,
      }).sort({ updatedAt: -1 });

      for (const group of techGroups) {
        // Get last message
        const activeMessages = filterActiveMessages(group.messages || []);
        const lastMessage = activeMessages.length > 0
          ? activeMessages.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))[0]
          : null;

        // Calculate unread count
        const unreadCount = activeMessages.filter(msg => 
          msg.userId !== userId && 
          (!msg.readBy || !msg.readBy.includes(userId))
        ).length;

        // Determine conversation type
        const conversationType = group.type === 'classroom' ? 'room' : 'community';

        conversations.push({
          _id: group.groupId,
          type: 'group',
          conversationType,
          title: group.name,
          participants: group.members || [],
          lastMessage: lastMessage ? {
            content: lastMessage.message || '',
            senderId: lastMessage.userId,
            senderName: lastMessage.username,
            timestamp: lastMessage.timestamp,
          } : null,
          unreadCount,
          pinnedBy: [],
          archivedBy: [],
          locked: group.locked || false,
          updatedAt: group.updatedAt ? group.updatedAt.toISOString() : group.createdAt.toISOString(),
        });
      }
    }

    // Get private circles where user is a member
    // Only include if explicitly requested (type=private-circle) or if no type filter (backward compatibility)
    // NEVER include in friend-only requests (type=friend)
    if (type === 'private-circle' || (type !== 'friend' && !type)) {
      const privateCircles = await PrivateCircle.find({
        'members.userId': userId,
      }).sort({ updatedAt: -1 });

      for (const circle of privateCircles) {
        // Get last message
        const activeMessages = filterActiveMessages(circle.messages || []);
        const lastMessage = activeMessages.length > 0
          ? activeMessages.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))[0]
          : null;

        // Calculate unread count
        const unreadCount = activeMessages.filter(msg => 
          msg.userId !== userId && 
          (!msg.readBy || !msg.readBy.includes(userId))
        ).length;

        conversations.push({
          _id: circle.circleId,
          type: 'group',
          conversationType: 'private-circle',
          title: circle.name,
          description: circle.description,
          participants: circle.members.map((m) => m.userId),
          createdBy: circle.createdBy,
          lastMessage: lastMessage ? {
            content: lastMessage.message || '',
            senderId: lastMessage.userId,
            senderName: lastMessage.username,
            timestamp: lastMessage.timestamp,
          } : null,
          unreadCount,
          pinnedBy: [],
          archivedBy: [],
          locked: false,
          updatedAt: circle.updatedAt ? circle.updatedAt.toISOString() : circle.createdAt.toISOString(),
        });
      }
    }

    // Sort all conversations by updatedAt (most recent first)
    conversations.sort((a, b) => {
      const dateA = new Date(a.updatedAt);
      const dateB = new Date(b.updatedAt);
      return dateB - dateA;
    });

    console.log(`[API] GET /api/conversations${type ? `?type=${type}` : ''} - Returning ${conversations.length} conversations for user ${userId}`);
    res.json(conversations);
  } catch (error) {
    console.error('[API] GET /api/conversations - Error:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// ========== PRIVATE CIRCLE ENDPOINTS ==========
// POST /api/private-circles - Create a new private circle/team
app.post('/api/private-circles', authenticateJWT, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: 'Database not connected' });
    }

    const { name, description = '', memberIds = [] } = req.body;
    const userId = req.user.userId;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Circle name is required' });
    }

    // Validate member IDs (if provided)
    const validMemberIds = Array.isArray(memberIds) ? memberIds.filter((id) => id && id !== userId) : [];
    
    // Verify all member IDs exist
    if (validMemberIds.length > 0) {
      const existingUsers = await User.find({ userId: { $in: validMemberIds } }).select('userId');
      const existingIds = existingUsers.map((u) => u.userId);
      const invalidIds = validMemberIds.filter((id) => !existingIds.includes(id));
      if (invalidIds.length > 0) {
        return res.status(400).json({ error: `Invalid user IDs: ${invalidIds.join(', ')}` });
      }
    }

    const circleId = generateId();
    const members = [
      { userId, role: 'admin' }, // Creator is admin
      ...validMemberIds.map((id) => ({ userId: id, role: 'member' })),
    ];

    const circle = new PrivateCircle({
      circleId,
      name: name.trim(),
      description: description.trim(),
      createdBy: userId,
      members,
      type: 'private-circle',
      messages: [],
    });

    await circle.save();

    // Emit socket event
    if (io) {
      members.forEach((member) => {
        const memberSocket = userSockets.get(member.userId);
        if (memberSocket) {
          io.to(memberSocket).emit('circle:created', {
            circleId: circle.circleId,
            name: circle.name,
            createdBy: userId,
          });
        }
      });
    }

    res.json({
      _id: circle.circleId,
      circleId: circle.circleId,
      name: circle.name,
      description: circle.description,
      createdBy: circle.createdBy,
      members: circle.members,
      type: 'private-circle',
      createdAt: circle.createdAt,
    });
  } catch (error) {
    console.error('[API] POST /api/private-circles - Error:', error);
    res.status(500).json({ error: 'Failed to create private circle' });
  }
});

// GET /api/private-circles - Get all private circles user is a member of
app.get('/api/private-circles', authenticateJWT, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: 'Database not connected' });
    }

    const userId = req.user.userId;
    const circles = await PrivateCircle.find({
      'members.userId': userId,
    })
      .sort({ updatedAt: -1 })
      .lean();

    res.json(circles);
  } catch (error) {
    console.error('[API] GET /api/private-circles - Error:', error);
    res.status(500).json({ error: 'Failed to fetch private circles' });
  }
});

// GET /api/private-circles/:circleId - Get a specific private circle
app.get('/api/private-circles/:circleId', authenticateJWT, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: 'Database not connected' });
    }

    const { circleId } = req.params;
    const userId = req.user.userId;

    const circle = await PrivateCircle.findOne({ circleId });
    if (!circle) {
      return res.status(404).json({ error: 'Private circle not found' });
    }

    // Verify user is a member
    const isMember = circle.members.some((m) => m.userId === userId);
    if (!isMember) {
      return res.status(403).json({ error: 'You are not a member of this circle' });
    }

    res.json(circle);
  } catch (error) {
    console.error('[API] GET /api/private-circles/:circleId - Error:', error);
    res.status(500).json({ error: 'Failed to fetch private circle' });
  }
});

// POST /api/private-circles/:circleId/members - Add members to a circle
app.post('/api/private-circles/:circleId/members', authenticateJWT, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: 'Database not connected' });
    }

    const { circleId } = req.params;
    const { userIds, username, email } = req.body;
    const currentUserId = req.user.userId;

    const circle = await PrivateCircle.findOne({ circleId });
    if (!circle) {
      return res.status(404).json({ error: 'Private circle not found' });
    }

    // Verify user is admin
    const currentMember = circle.members.find((m) => m.userId === currentUserId);
    if (!currentMember || currentMember.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can add members' });
    }

    let targetUserIds = [];

    // Handle userIds array
    if (Array.isArray(userIds) && userIds.length > 0) {
      targetUserIds = userIds.filter((id) => id && id !== currentUserId);
    }

    // Handle username or email search
    if (username || email) {
      const identifier = username || email;
      const user = await User.findOne({
        $or: [
          { username: { $regex: new RegExp(`^${identifier}$`, 'i') } },
          { email: { $regex: new RegExp(`^${identifier}$`, 'i') } },
        ],
      });
      if (!user) {
        return res.status(404).json({ error: `User not found: ${identifier}` });
      }
      if (user.userId === currentUserId) {
        return res.status(400).json({ error: 'You cannot add yourself to the circle' });
      }
      targetUserIds.push(user.userId);
    }

    if (targetUserIds.length === 0) {
      return res.status(400).json({ error: 'No valid user IDs provided' });
    }

    // Verify users exist and are not already members
    const existingUsers = await User.find({ userId: { $in: targetUserIds } }).select('userId');
    const existingIds = existingUsers.map((u) => u.userId);
    const newMemberIds = targetUserIds.filter(
      (id) => !circle.members.some((m) => m.userId === id) && existingIds.includes(id)
    );

    if (newMemberIds.length === 0) {
      return res.status(400).json({ error: 'All users are already members or invalid' });
    }

    // Add new members
    newMemberIds.forEach((userId) => {
      circle.members.push({ userId, role: 'member' });
    });

    await circle.save();

    // Emit socket events
    if (io) {
      newMemberIds.forEach((userId) => {
        const memberSocket = userSockets.get(userId);
        if (memberSocket) {
          io.to(memberSocket).emit('circle:member:added', {
            circleId: circle.circleId,
            circleName: circle.name,
            addedBy: currentUserId,
          });
        }
      });
    }

    res.json(circle);
  } catch (error) {
    console.error('[API] POST /api/private-circles/:circleId/members - Error:', error);
    res.status(500).json({ error: 'Failed to add members' });
  }
});

// DELETE /api/private-circles/:circleId/members/:memberId - Remove a member from circle
app.delete('/api/private-circles/:circleId/members/:memberId', authenticateJWT, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: 'Database not connected' });
    }

    const { circleId, memberId } = req.params;
    const currentUserId = req.user.userId;

    const circle = await PrivateCircle.findOne({ circleId });
    if (!circle) {
      return res.status(404).json({ error: 'Private circle not found' });
    }

    // Verify user is admin or removing themselves
    const currentMember = circle.members.find((m) => m.userId === currentUserId);
    const isAdmin = currentMember && currentMember.role === 'admin';
    const isSelfRemoval = memberId === currentUserId;

    if (!isAdmin && !isSelfRemoval) {
      return res.status(403).json({ error: 'Only admins can remove other members' });
    }

    // Prevent removing the last admin
    const admins = circle.members.filter((m) => m.role === 'admin');
    const targetMember = circle.members.find((m) => m.userId === memberId);
    if (targetMember && targetMember.role === 'admin' && admins.length === 1) {
      return res.status(400).json({ error: 'Cannot remove the last admin' });
    }

    // Remove member
    circle.members = circle.members.filter((m) => m.userId !== memberId);
    await circle.save();

    // Emit socket event
    if (io) {
      const memberSocket = userSockets.get(memberId);
      if (memberSocket) {
        io.to(memberSocket).emit('circle:member:removed', {
          circleId: circle.circleId,
          circleName: circle.name,
        });
      }
    }

    res.json({ success: true, message: 'Member removed successfully' });
  } catch (error) {
    console.error('[API] DELETE /api/private-circles/:circleId/members/:memberId - Error:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

// DELETE /api/private-circles/:circleId - Delete a private circle
app.delete('/api/private-circles/:circleId', authenticateJWT, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: 'Database not connected' });
    }

    const { circleId } = req.params;
    const userId = req.user.userId;

    const circle = await PrivateCircle.findOne({ circleId });
    if (!circle) {
      return res.status(404).json({ error: 'Private circle not found' });
    }

    // Only creator can delete
    if (circle.createdBy !== userId) {
      return res.status(403).json({ error: 'Only the creator can delete the circle' });
    }

    await PrivateCircle.deleteOne({ circleId });

    // Emit socket event
    if (io) {
      circle.members.forEach((member) => {
        const memberSocket = userSockets.get(member.userId);
        if (memberSocket) {
          io.to(memberSocket).emit('circle:deleted', {
            circleId: circle.circleId,
          });
        }
      });
    }

    res.json({ success: true, message: 'Private circle deleted successfully' });
  } catch (error) {
    console.error('[API] DELETE /api/private-circles/:circleId - Error:', error);
    res.status(500).json({ error: 'Failed to delete private circle' });
  }
});

// POST /api/conversations - Create a new conversation (for friend-to-friend chats)
app.post('/api/conversations', authenticateJWT, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({error: 'Database not connected'});
    }

    const {participantId} = req.body;
    const userId = req.user.userId;

    if (!participantId || participantId === userId) {
      return res.status(400).json({error: 'Valid participant ID is required'});
    }

    // Check if participants are friends
    const currentUser = await User.findOne({userId});
    if (!currentUser || !currentUser.friends?.includes(participantId)) {
      return res.status(403).json({error: 'You can only start conversations with friends'});
    }

    // Check if conversation already exists
    const existingChat = await PrivateChat.findOne({
      participants: {$all: [userId, participantId], $size: 2}
    });

    if (existingChat) {
      // Return existing conversation
      const otherUser = await User.findOne({userId: participantId}, {username: 1, online: 1, lastSeen: 1});
      return res.json({
        _id: existingChat.chatId,
        type: 'dm',
        conversationType: 'friend',
        title: otherUser?.username || 'Private conversation',
        participants: existingChat.participants,
        otherParticipant: otherUser ? {
          userId: otherUser.userId,
          username: otherUser.username,
          online: otherUser.online || false,
          lastSeen: otherUser.lastSeen,
        } : null,
        lastMessage: null,
        unreadCount: 0,
        pinnedBy: [],
        archivedBy: [],
        locked: false,
        updatedAt: existingChat.updatedAt?.toISOString() || existingChat.createdAt.toISOString(),
      });
    }

    // Create new conversation
    const chatId = generateId();
    const newChat = new PrivateChat({
      chatId,
      participants: [userId, participantId],
      messages: [],
    });

    await newChat.save();

    const otherUser = await User.findOne({userId: participantId}, {username: 1, online: 1, lastSeen: 1});

    const io = req.app.get('io');
    if (io) {
      io.emit('conversation:created', {
        _id: chatId,
        type: 'dm',
        conversationType: 'friend',
      });
    }

    res.status(201).json({
      _id: chatId,
      type: 'dm',
      conversationType: 'friend',
      title: otherUser?.username || 'Private conversation',
      participants: [userId, participantId],
      otherParticipant: otherUser ? {
        userId: otherUser.userId,
        username: otherUser.username,
        online: otherUser.online || false,
        lastSeen: otherUser.lastSeen,
      } : null,
      lastMessage: null,
      unreadCount: 0,
      pinnedBy: [],
      archivedBy: [],
      locked: false,
      updatedAt: newChat.createdAt.toISOString(),
    });
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({error: 'Failed to create conversation'});
  }
});

// GET /api/conversations/:conversationId/messages - Get messages for a conversation (DM or group)
app.get('/api/conversations/:conversationId/messages', authenticateJWT, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      console.warn('[API] GET /api/conversations/:conversationId/messages - Database not connected, returning empty array');
      return res.json({ data: [], nextCursor: undefined });
    }

    const { conversationId } = req.params;
    const userId = req.user.userId;
    const { limit = '30', cursor } = req.query;
    const limitNum = Math.min(parseInt(limit, 10) || 30, 100);

    // Try to find as private circle first
    let privateCircle = await PrivateCircle.findOne({ circleId: conversationId });
    if (privateCircle) {
      const isMember = privateCircle.members.some((m) => m.userId === userId);
      if (!isMember) {
        return res.status(403).json({ error: 'You are not a member of this circle' });
      }

      let messages = filterActiveMessages(privateCircle.messages || []);
      messages.sort((a, b) => {
        const dateA = new Date(a.timestamp || 0);
        const dateB = new Date(b.timestamp || 0);
        return dateB - dateA;
      });

      const cursorIndex = cursor ? messages.findIndex((m) => m.messageId === cursor) : -1;
      const startIndex = cursorIndex >= 0 ? cursorIndex + 1 : 0;
      const limitedMessages = messages.slice(startIndex, startIndex + limitNum);

      const serializedMessages = limitedMessages.map((msg) => ({
        _id: msg.messageId,
        conversationId: conversationId,
        conversationType: 'private-circle',
        senderId: msg.userId,
        content: msg.message || '',
        type: msg.type || 'text',
        media: msg.attachments?.map((att) => ({
          key: att.url,
          url: att.url,
          type: att.type?.startsWith('image/') ? 'image' : att.type?.startsWith('audio/') ? 'audio' : 'file',
          filename: att.name,
          size: att.size,
        })) || [],
        voiceNote: msg.voiceNote?.url ? {
          url: msg.voiceNote.url,
          duration: msg.voiceNote.duration,
        } : undefined,
        reactions: Object.fromEntries(msg.reactions || new Map()),
        readBy: msg.readBy || [],
        createdAt: msg.timestamp?.toISOString() || new Date().toISOString(),
      }));

      const nextCursor = limitedMessages.length === limitNum && startIndex + limitNum < messages.length
        ? limitedMessages[limitedMessages.length - 1].messageId
        : undefined;

      console.log(`[API] GET /api/conversations/${conversationId}/messages - Returning ${serializedMessages.length} messages for private circle`);
      return res.json({ data: serializedMessages, nextCursor });
    }

    // Try to find as private conversation (friend DM) - check PrivateConversation first
    // Friend conversations use format: friend-{userA}-{userB}
    let privateConversation = null;
    if (conversationId.startsWith('friend-')) {
      privateConversation = await PrivateConversation.findOne({ conversationId });
    }
    
    if (privateConversation && privateConversation.participants.includes(userId)) {
      // Found PrivateConversation, now find the corresponding PrivateChat
      // PrivateChat uses chatId = {userA}-{userB} (without 'friend-' prefix)
      // So we need to strip 'friend-' prefix or match by participants
      const chatIdWithoutPrefix = conversationId.replace(/^friend-/, '');
      let privateChat = await PrivateChat.findOne({ 
        $or: [
          { chatId: conversationId }, // Try exact match first
          { chatId: chatIdWithoutPrefix }, // Try without 'friend-' prefix
          { participants: { $all: privateConversation.participants, $size: 2 } } // Match by participants
        ]
      });
      
      if (privateChat) {
        // It's a private chat, return messages
        let messages = filterActiveMessages(privateChat.messages || []);
      
      // Sort by timestamp (newest first) for pagination
      messages.sort((a, b) => {
        const dateA = new Date(a.timestamp || 0);
        const dateB = new Date(b.timestamp || 0);
        return dateB - dateA;
      });

      // Convert to frontend Message format
      const formattedMessages = messages.map((msg) => ({
        _id: msg.messageId,
        conversationId: conversationId,
        senderId: msg.userId,
        content: msg.message || '',
        media: (msg.attachments || []).map(att => ({
          key: att.url,
          url: att.url,
          type: att.type?.startsWith('image/') ? 'image' : att.type?.startsWith('video/') ? 'video' : att.type?.startsWith('audio/') ? 'audio' : 'file',
          mimeType: att.type,
          size: att.size || 0
        })),
        replyToMessageId: undefined,
        editedAt: undefined,
        deletedAt: undefined,
        reactions: (msg.reactions && typeof msg.reactions === 'object') ? msg.reactions : {},
        deliveredTo: [],
        readBy: msg.readBy || [],
        isPinned: false,
        isEncrypted: false,
        createdAt: msg.timestamp || new Date().toISOString(),
        lastModified: msg.timestamp || new Date().toISOString()
      }));

      // Apply cursor-based pagination if provided
      let resultMessages = formattedMessages;
      if (cursor) {
        const cursorIndex = resultMessages.findIndex(m => m._id === cursor);
        if (cursorIndex !== -1) {
          resultMessages = resultMessages.slice(cursorIndex + 1);
        }
      }

      // Limit results
      const limitedMessages = resultMessages.slice(0, limitNum);
      const nextCursor = limitedMessages.length === limitNum && resultMessages.length > limitNum 
        ? limitedMessages[limitedMessages.length - 1]._id 
        : undefined;

      // Reverse to show oldest first (chat order)
      limitedMessages.reverse();

      console.log(`[API] GET /api/conversations/${conversationId}/messages - Returning ${limitedMessages.length} messages for private chat`);
      return res.json({
        data: limitedMessages,
        nextCursor
      });
      } else {
        // PrivateConversation exists but no PrivateChat yet - return empty array
        console.log(`[API] GET /api/conversations/${conversationId}/messages - PrivateConversation found but no messages yet`);
        return res.json({ data: [], nextCursor: undefined });
      }
    }

    // Try to find as private chat (friend DM) - fallback for old format or direct chatId lookup
    let privateChat = await PrivateChat.findOne({ chatId: conversationId });
    if (privateChat && privateChat.participants.includes(userId)) {
      // It's a private chat, return messages
      let messages = filterActiveMessages(privateChat.messages || []);
      
      // Sort by timestamp (newest first) for pagination
      messages.sort((a, b) => {
        const dateA = new Date(a.timestamp || 0);
        const dateB = new Date(b.timestamp || 0);
        return dateB - dateA;
      });

      // Convert to frontend Message format
      const formattedMessages = messages.map((msg) => ({
        _id: msg.messageId,
        conversationId: conversationId,
        senderId: msg.userId,
        content: msg.message || '',
        media: (msg.attachments || []).map(att => ({
          key: att.url,
          url: att.url,
          type: att.type?.startsWith('image/') ? 'image' : att.type?.startsWith('video/') ? 'video' : att.type?.startsWith('audio/') ? 'audio' : 'file',
          mimeType: att.type,
          size: att.size || 0
        })),
        replyToMessageId: undefined,
        editedAt: undefined,
        deletedAt: undefined,
        reactions: (msg.reactions && typeof msg.reactions === 'object') ? msg.reactions : {},
        deliveredTo: [],
        readBy: msg.readBy || [],
        isPinned: false,
        isEncrypted: false,
        createdAt: msg.timestamp || new Date().toISOString(),
        lastModified: msg.timestamp || new Date().toISOString()
      }));

      // Apply cursor-based pagination if provided
      let resultMessages = formattedMessages;
      if (cursor) {
        const cursorIndex = resultMessages.findIndex(m => m._id === cursor);
        if (cursorIndex !== -1) {
          resultMessages = resultMessages.slice(cursorIndex + 1);
        }
      }

      // Limit results
      const limitedMessages = resultMessages.slice(0, limitNum);
      const nextCursor = limitedMessages.length === limitNum && resultMessages.length > limitNum 
        ? limitedMessages[limitedMessages.length - 1]._id 
        : undefined;

      // Reverse to show oldest first (chat order)
      limitedMessages.reverse();

      console.log(`[API] GET /api/conversations/${conversationId}/messages - Returning ${limitedMessages.length} messages for private chat (fallback)`);
      return res.json({
        data: limitedMessages,
        nextCursor
      });
    }

    // Try to find as tech group
    let techGroup = await TechGroup.findOne({ groupId: conversationId });
    if (techGroup && techGroup.members.includes(userId)) {
      // It's a tech group, return messages
      let messages = filterActiveMessages(techGroup.messages || []);
      
      // Sort by timestamp (newest first) for pagination
      messages.sort((a, b) => {
        const dateA = new Date(a.timestamp || 0);
        const dateB = new Date(b.timestamp || 0);
        return dateB - dateA;
      });

      // Convert to frontend Message format
      const formattedMessages = messages.map((msg) => ({
        _id: msg.messageId,
        conversationId: conversationId,
        senderId: msg.userId,
        content: msg.message || '',
        media: (msg.attachments || []).map(att => ({
          key: att.url,
          url: att.url,
          type: att.type?.startsWith('image/') ? 'image' : att.type?.startsWith('video/') ? 'video' : att.type?.startsWith('audio/') ? 'audio' : 'file',
          mimeType: att.type,
          size: att.size || 0
        })),
        replyToMessageId: undefined,
        editedAt: undefined,
        deletedAt: undefined,
        reactions: (msg.reactions && typeof msg.reactions === 'object') ? msg.reactions : {},
        deliveredTo: [],
        readBy: msg.readBy || [],
        isPinned: false,
        isEncrypted: false,
        createdAt: msg.timestamp || new Date().toISOString(),
        lastModified: msg.timestamp || new Date().toISOString()
      }));

      // Apply cursor-based pagination if provided
      let resultMessages = formattedMessages;
      if (cursor) {
        const cursorIndex = resultMessages.findIndex(m => m._id === cursor);
        if (cursorIndex !== -1) {
          resultMessages = resultMessages.slice(cursorIndex + 1);
        }
      }

      // Limit results
      const limitedMessages = resultMessages.slice(0, limitNum);
      const nextCursor = limitedMessages.length === limitNum && resultMessages.length > limitNum 
        ? limitedMessages[limitedMessages.length - 1]._id 
        : undefined;

      // Reverse to show oldest first (chat order)
      limitedMessages.reverse();

      console.log(`[API] GET /api/conversations/${conversationId}/messages - Returning ${limitedMessages.length} messages for tech group`);
      return res.json({
        data: limitedMessages,
        nextCursor
      });
    }

    // Conversation not found or user not a participant
    return res.status(404).json({ error: 'Conversation not found or access denied' });
  } catch (error) {
    console.error('[API] GET /api/conversations/:conversationId/messages - Error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// GET /api/classrooms - Get all classrooms (tech groups with type 'classroom')
app.get('/api/classrooms', authenticateJWT, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      console.warn('[API] GET /api/classrooms - Database not connected, returning empty array');
      return res.json([]);
    }

    const userId = req.user.userId;
    
    // Get all tech groups with type 'classroom'
    const classroomGroups = await TechGroup.find({
      type: 'classroom'
    }).sort({ createdAt: -1 });

    // Format as Classroom objects expected by frontend
    const classrooms = await Promise.all(classroomGroups.map(async (group) => {
      // Get instructor info (createdBy user)
      const instructor = await User.findOne({ userId: group.createdBy }, { username: 1, userId: 1 });
      
      // Convert messages to sessions (simplified - assuming each message is a session announcement)
      // In a real implementation, sessions would be a separate model/field
      // For now, we'll create a basic session structure
      const sessions = group.messages
        .filter(msg => msg.userId === 'system' || msg.userId === group.createdBy)
        .slice(0, 10) // Limit to recent sessions
        .map((msg, index) => ({
          _id: msg.messageId || `session-${index}`,
          title: msg.message?.includes('**') ? msg.message.match(/\*\*([^*]+)\*\*/)?.[1] || 'Class Session' : 'Class Session',
          description: msg.message || '',
          instructor: group.createdBy,
          date: msg.timestamp ? msg.timestamp.toISOString() : new Date().toISOString(),
          durationMinutes: 60,
          link: undefined,
          materials: [],
          participants: group.members || [],
          attendance: []
        }));

      return {
        _id: group.groupId,
        title: group.name,
        description: group.description || '',
        instructor: instructor ? {
          _id: instructor.userId,
          username: instructor.username,
          avatarUrl: undefined
        } : {
          _id: group.createdBy,
          username: 'Instructor',
          avatarUrl: undefined
        },
        schedule: sessions.length > 0 ? sessions : [{
          _id: 'default-session',
          title: 'Upcoming Session',
          description: 'Check back soon for session details',
          instructor: group.createdBy,
          date: new Date().toISOString(),
          durationMinutes: 60,
          link: undefined,
          materials: [],
          participants: group.members || [],
          attendance: []
        }]
      };
    }));

    console.log(`[API] GET /api/classrooms - Returning ${classrooms.length} classrooms`);
    res.json(classrooms);
  } catch (error) {
    console.error('[API] GET /api/classrooms - Error:', error);
    res.status(500).json({ error: 'Failed to fetch classrooms' });
  }
});

// GET /api/private-chats - Get all private chats for user
app.get('/api/private-chats', authenticateJWT, async (req, res) => {
  try {
    const chats = await PrivateChat.find({
      participants: req.user.userId
    }).sort({ updatedAt: -1 });
    res.json(chats);
  } catch (error) {
    console.error('Get private chats error:', error);
    res.status(500).json({ error: 'Failed to fetch private chats' });
  }
});

// GET /api/private-chats/:chatId - Get single private chat
app.get('/api/private-chats/:chatId', authenticateJWT, async (req, res) => {
  try {
    const { chatId } = req.params;
    const chat = await PrivateChat.findOne({ chatId });
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    if (!chat.participants.includes(req.user.userId)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    res.json(chat);
  } catch (error) {
    console.error('Get private chat error:', error);
    res.status(500).json({ error: 'Failed to fetch private chat' });
  }
});

// POST /api/private-chats - Create new private chat
app.post('/api/private-chats', authenticateJWT, async (req, res) => {
  try {
    const { participantId } = req.body;
    if (!participantId) {
      return res.status(400).json({ error: 'Participant ID is required' });
    }
    
    const chatId = getChatId(req.user.userId, participantId);
    let chat = await PrivateChat.findOne({ chatId });
    
    if (!chat) {
      chat = new PrivateChat({
        chatId,
        participants: [req.user.userId, participantId],
        messages: []
      });
      await chat.save();
    }
    
    res.status(201).json(chat);
  } catch (error) {
    console.error('Create private chat error:', error);
    res.status(500).json({ error: 'Failed to create private chat' });
  }
});

// PUT /api/private-chats/:chatId - Update private chat
app.put('/api/private-chats/:chatId', authenticateJWT, async (req, res) => {
  try {
    const { chatId } = req.params;
    const chat = await PrivateChat.findOne({ chatId });
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    if (!chat.participants.includes(req.user.userId)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Only allow updating certain fields
    if (req.body.messages) {
      chat.messages = req.body.messages;
    }
    
    chat.updatedAt = new Date();
    await chat.save();
    res.json(chat);
  } catch (error) {
    console.error('Update private chat error:', error);
    res.status(500).json({ error: 'Failed to update private chat' });
  }
});

// DELETE /api/private-chats/:chatId - Delete private chat
app.delete('/api/private-chats/:chatId', authenticateJWT, async (req, res) => {
  try {
    const { chatId } = req.params;
    const chat = await PrivateChat.findOne({ chatId });
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    if (!chat.participants.includes(req.user.userId)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    await PrivateChat.deleteOne({ chatId });
    res.json({ message: 'Chat deleted successfully' });
  } catch (error) {
    console.error('Delete private chat error:', error);
    res.status(500).json({ error: 'Failed to delete private chat' });
  }
});

// ========== TRAINING REQUEST CRUD ==========
// GET /api/training-requests - Get all training requests
app.get('/api/training-requests', authenticateJWT, async (req, res) => {
  try {
    // Check MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ 
        error: 'Database connection unavailable',
        message: 'MongoDB is not connected. Please try again in a moment.'
      });
    }
    
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
    const query = isAdmin ? {} : { userId: req.user.userId };
    const requests = await TrainingRequest.find(query).sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    console.error('Get training requests error:', error);
    res.status(500).json({ error: 'Failed to fetch training requests', details: error.message });
  }
});

// GET /api/training-requests/:requestId - Get single training request
app.get('/api/training-requests/:requestId', authenticateJWT, async (req, res) => {
  try {
    // Check MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ 
        error: 'Database connection unavailable',
        message: 'MongoDB is not connected. Please try again in a moment.'
      });
    }
    
    const { requestId } = req.params;
    if (!requestId || requestId.trim() === '') {
      return res.status(400).json({ error: 'Request ID is required' });
    }
    
    const request = await TrainingRequest.findOne({ requestId: requestId.trim() });
    if (!request) {
      return res.status(404).json({ error: 'Training request not found' });
    }
    if (req.user.role !== 'admin' && request.userId !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    res.json(request);
  } catch (error) {
    console.error('Get training request error:', error);
    res.status(500).json({ error: 'Failed to fetch training request', details: error.message });
  }
});

// POST /api/training-requests - Create training request
app.post('/api/training-requests', authenticateJWT, async (req, res) => {
  try {
    const { requestedCourse, motivation = '' } = req.body;
    if (!requestedCourse || requestedCourse.trim().length < 2) {
      return res.status(400).json({ error: 'Course name must be at least 2 characters' });
    }
    
    const user = await User.findOne({ userId: req.user.userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const request = new TrainingRequest({
      requestId: generateId(),
      userId: req.user.userId,
      username: user.username,
      requestedCourse: requestedCourse.trim(),
      motivation: motivation.trim(),
      status: 'pending'
    });
    await request.save();
    
    res.status(201).json(request);
  } catch (error) {
    console.error('Create training request error:', error);
    res.status(500).json({ error: 'Failed to create training request' });
  }
});

// PUT /api/training-requests/:requestId - Update training request
app.put('/api/training-requests/:requestId', authenticateJWT, async (req, res) => {
  try {
    // Check MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ 
        error: 'Database connection unavailable',
        message: 'MongoDB is not connected. Please try again in a moment.'
      });
    }
    
    const { requestId } = req.params;
    if (!requestId || requestId.trim() === '') {
      return res.status(400).json({ error: 'Request ID is required' });
    }
    
    const request = await TrainingRequest.findOne({ requestId: requestId.trim() });
    if (!request) {
      return res.status(404).json({ error: 'Training request not found' });
    }
    
    // Only admins can update status, users can only update their own pending requests
    if (req.user.role !== 'admin') {
      if (request.userId !== req.user.userId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      if (request.status !== 'pending') {
        return res.status(400).json({ error: 'Can only update pending requests' });
      }
    }
    
    if (req.body.requestedCourse) request.requestedCourse = req.body.requestedCourse.trim();
    if (req.body.motivation !== undefined) request.motivation = req.body.motivation.trim();
    if (req.body.status && req.user.role === 'admin') {
      request.status = req.body.status;
      request.decidedBy = req.user.userId;
      request.decidedAt = new Date();
    }
    
    await request.save();
    res.json(request);
  } catch (error) {
    console.error('Update training request error:', error);
    res.status(500).json({ error: 'Failed to update training request' });
  }
});

// DELETE /api/training-requests/:requestId - Delete training request
app.delete('/api/training-requests/:requestId', authenticateJWT, async (req, res) => {
  try {
    // Check MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ 
        error: 'Database connection unavailable',
        message: 'MongoDB is not connected. Please try again in a moment.'
      });
    }
    
    const { requestId } = req.params;
    if (!requestId || requestId.trim() === '') {
      return res.status(400).json({ error: 'Request ID is required' });
    }
    
    const request = await TrainingRequest.findOne({ requestId: requestId.trim() });
    if (!request) {
      return res.status(404).json({ error: 'Training request not found' });
    }
    
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin' && request.userId !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    await TrainingRequest.deleteOne({ requestId: requestId.trim() });
    res.json({ message: 'Training request deleted successfully' });
  } catch (error) {
    console.error('Delete training request error:', error);
    res.status(500).json({ error: 'Failed to delete training request', details: error.message });
  }
});

// ========== CLASSROOM REQUEST CRUD ==========
// PUT /api/classroom-requests/:requestId - Update classroom request
app.put('/api/classroom-requests/:requestId', authenticateJWT, async (req, res) => {
  try {
    const { requestId } = req.params;
    const request = await ClassroomRequest.findOne({ requestId });
    if (!request) {
      return res.status(404).json({ error: 'Classroom request not found' });
    }
    
    // Only creator can update pending requests, or admin can update any
    if (req.user.role !== 'admin' && request.createdBy !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    if (request.status !== 'pending' && req.user.role !== 'admin') {
      return res.status(400).json({ error: 'Can only update pending requests' });
    }
    
    if (req.body.name) request.name = req.body.name.trim();
    if (req.body.description !== undefined) request.description = req.body.description.trim();
    if (req.body.adminNotes && req.user.role === 'admin') {
      request.adminNotes = req.body.adminNotes.trim();
    }
    
    await request.save();
    res.json(serializeClassroomRequest(request));
  } catch (error) {
    console.error('Update classroom request error:', error);
    res.status(500).json({ error: 'Failed to update classroom request' });
  }
});

// DELETE /api/classroom-requests/:requestId - Delete classroom request
app.delete('/api/classroom-requests/:requestId', authenticateJWT, async (req, res) => {
  try {
    const { requestId } = req.params;
    const request = await ClassroomRequest.findOne({ requestId });
    if (!request) {
      return res.status(404).json({ error: 'Classroom request not found' });
    }
    
    // Only creator or admin can delete
    if (req.user.role !== 'admin' && request.createdBy !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    await ClassroomRequest.deleteOne({ requestId });
    res.json({ message: 'Classroom request deleted successfully' });
  } catch (error) {
    console.error('Delete classroom request error:', error);
    res.status(500).json({ error: 'Failed to delete classroom request' });
  }
});

// ========== ADMIN LOG CRUD ==========
// POST /api/admin/logs - Create admin log (usually auto-created, but manual creation allowed)
app.post('/api/admin/logs', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const { action, targetUserId, targetUsername, details = '' } = req.body;
    if (!action || !targetUserId || !targetUsername) {
      return res.status(400).json({ error: 'Action, targetUserId, and targetUsername are required' });
    }
    
    const log = new AdminLog({
      logId: generateId(),
      adminId: req.user.userId,
      adminUsername: req.user.username,
      action,
      targetUserId,
      targetUsername,
      details: details.trim()
    });
    await log.save();
    
    res.status(201).json(log);
  } catch (error) {
    console.error('Create admin log error:', error);
    res.status(500).json({ error: 'Failed to create admin log' });
  }
});

// GET /api/admin/logs/:logId - Get single admin log
app.get('/api/admin/logs/:logId', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    // Check MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ 
        error: 'Database connection unavailable',
        message: 'MongoDB is not connected. Please try again in a moment.'
      });
    }
    
    const { logId } = req.params;
    if (!logId || logId.trim() === '') {
      return res.status(400).json({ error: 'Log ID is required' });
    }
    
    const log = await AdminLog.findOne({ logId: logId.trim() });
    if (!log) {
      return res.status(404).json({ error: 'Admin log not found' });
    }
    res.json(log);
  } catch (error) {
    console.error('Get admin log error:', error);
    res.status(500).json({ error: 'Failed to fetch admin log', details: error.message });
  }
});

// ========== VIOLATION CRUD ==========
// POST /api/admin/violations - Create violation (usually auto-created, but manual creation allowed)
app.post('/api/admin/violations', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const { userId, username, messageId, groupId, chatId, offendingContent, triggerWord, status = 'warning' } = req.body;
    if (!userId || !username || !offendingContent || !triggerWord) {
      return res.status(400).json({ error: 'userId, username, offendingContent, and triggerWord are required' });
    }
    
    const violation = new Violation({
      violationId: generateId(),
      userId,
      username,
      messageId,
      groupId,
      chatId,
      offendingContent,
      triggerWord,
      status
    });
    await violation.save();
    
    res.status(201).json(violation);
  } catch (error) {
    console.error('Create violation error:', error);
    res.status(500).json({ error: 'Failed to create violation' });
  }
});

// GET /api/admin/violations/:violationId - Get single violation
app.get('/api/admin/violations/:violationId', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    // Check MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ 
        error: 'Database connection unavailable',
        message: 'MongoDB is not connected. Please try again in a moment.'
      });
    }
    
    const { violationId } = req.params;
    if (!violationId || violationId.trim() === '') {
      return res.status(400).json({ error: 'Violation ID is required' });
    }
    
    const violation = await Violation.findOne({ violationId: violationId.trim() });
    if (!violation) {
      return res.status(404).json({ error: 'Violation not found' });
    }
    res.json(violation);
  } catch (error) {
    console.error('Get violation error:', error);
    res.status(500).json({ error: 'Failed to fetch violation', details: error.message });
  }
});

// PUT /api/admin/violations/:violationId - Update violation
app.put('/api/admin/violations/:violationId', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const { violationId } = req.params;
    const violation = await Violation.findOne({ violationId });
    if (!violation) {
      return res.status(404).json({ error: 'Violation not found' });
    }
    
    if (req.body.status) violation.status = req.body.status;
    if (req.body.offendingContent) violation.offendingContent = req.body.offendingContent;
    if (req.body.triggerWord) violation.triggerWord = req.body.triggerWord;
    
    await violation.save();
    res.json(violation);
  } catch (error) {
    console.error('Update violation error:', error);
    res.status(500).json({ error: 'Failed to update violation' });
  }
});

// DELETE /api/admin/violations/:violationId - Delete violation
app.delete('/api/admin/violations/:violationId', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    // Check MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ 
        error: 'Database connection unavailable',
        message: 'MongoDB is not connected. Please try again in a moment.'
      });
    }
    
    const { violationId } = req.params;
    if (!violationId || violationId.trim() === '') {
      return res.status(400).json({ error: 'Violation ID is required' });
    }
    
    const violation = await Violation.findOne({ violationId: violationId.trim() });
    if (!violation) {
      return res.status(404).json({ error: 'Violation not found' });
    }
    
    await Violation.deleteOne({ violationId: violationId.trim() });
    res.json({ message: 'Violation deleted successfully' });
  } catch (error) {
    console.error('Delete violation error:', error);
    res.status(500).json({ error: 'Failed to delete violation', details: error.message });
  }
});

// Knowledge API endpoint - returns empty array (no Knowledge model yet, but keeps endpoint working)
app.get('/api/knowledge', async (req, res) => {
  try {
    console.log('[API] GET /api/knowledge - Request received', req.query);
    
    // Check MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      console.warn('[API] GET /api/knowledge - Database not connected, returning empty array');
      return res.json([]);
    }
    
    // For now, return empty array - can be extended when Knowledge model exists
    // This prevents 500 errors when frontend requests knowledge data
    console.log('[API] GET /api/knowledge - Returning empty array (stub endpoint)');
    res.json([]);
  } catch (error) {
    console.error('[API] GET /api/knowledge - Error:', error);
    // Return empty array instead of 500 error
    res.json([]);
  }
});

// POST /api/knowledge/:id/like - Like a knowledge post (stub - returns 501)
app.post('/api/knowledge/:id/like', authenticateJWT, async (req, res) => {
  try {
    console.log('[API] POST /api/knowledge/:id/like - Request received (not implemented)');
    res.status(501).json({ 
      error: 'Not implemented',
      message: 'Knowledge like feature is not yet implemented. Knowledge model needs to be created first.'
    });
  } catch (error) {
    console.error('[API] POST /api/knowledge/:id/like - Error:', error);
    res.status(500).json({ error: 'Failed to like knowledge post' });
  }
});

// POST /api/knowledge/:id/bookmark - Bookmark a knowledge post (stub - returns 501)
app.post('/api/knowledge/:id/bookmark', authenticateJWT, async (req, res) => {
  try {
    console.log('[API] POST /api/knowledge/:id/bookmark - Request received (not implemented)');
    res.status(501).json({ 
      error: 'Not implemented',
      message: 'Knowledge bookmark feature is not yet implemented. Knowledge model needs to be created first.'
    });
  } catch (error) {
    console.error('[API] POST /api/knowledge/:id/bookmark - Error:', error);
    res.status(500).json({ error: 'Failed to bookmark knowledge post' });
  }
});

// GET /api/knowledge/leaderboard - Get knowledge engagement leaderboard
app.get('/api/knowledge/leaderboard', authenticateJWT, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      console.warn('[API] GET /api/knowledge/leaderboard - Database not connected, returning empty array');
      return res.json([]);
    }

    // Calculate engagement metrics from tech groups (messages sent = engagement)
    const techGroups = await TechGroup.find({});
    const userEngagement = {};

    // Count messages per user
    techGroups.forEach(group => {
      if (Array.isArray(group.messages)) {
        group.messages.forEach(msg => {
          if (msg.userId && msg.userId !== 'system') {
            if (!userEngagement[msg.userId]) {
              userEngagement[msg.userId] = {
                userId: msg.userId,
                messagesSent: 0,
                materialsShared: 0,
                classesAttended: 0,
                badges: [],
                xp: 0
              };
            }
            userEngagement[msg.userId].messagesSent += 1;
          }
        });
      }
    });

    // Calculate XP (simple formula: messages * 10)
    Object.values(userEngagement).forEach(engagement => {
      engagement.xp = engagement.messagesSent * 10;
    });

    // Get user details and format as EngagementMetric
    const leaderboardEntries = await Promise.all(
      Object.values(userEngagement).map(async (engagement) => {
        const user = await User.findOne({ userId: engagement.userId }).select('username userId skills skillLevel');
        if (!user) return null;

        return {
          userId: {
            _id: user.userId || user._id?.toString(),
            username: user.username || 'Unknown',
            avatarUrl: undefined,
            skills: user.skills || [],
            skillLevel: user.skillLevel || 'Beginner'
          },
          messagesSent: engagement.messagesSent,
          materialsShared: engagement.materialsShared,
          classesAttended: engagement.classesAttended,
          badges: engagement.badges,
          xp: engagement.xp
        };
      })
    );

    // Filter out nulls and sort by XP (descending)
    const leaderboard = leaderboardEntries
      .filter(entry => entry !== null)
      .sort((a, b) => b.xp - a.xp);

    console.log(`[API] GET /api/knowledge/leaderboard - Returning ${leaderboard.length} entries`);
    res.json(leaderboard);
  } catch (error) {
    console.error('[API] GET /api/knowledge/leaderboard - Error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Health check endpoint with detailed status
app.get('/api/health', async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState;
    const dbStatusText = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    }[dbStatus] || 'unknown';
    
    // Check collections exist
    const collections = [];
    if (dbStatus === 1) {
      try {
        const db = mongoose.connection.db;
        const collectionList = await db.listCollections().toArray();
        collections.push(...collectionList.map(c => c.name));
      } catch (err) {
        console.error('[Health] Error listing collections:', err);
      }
    }
    
    const io = req.app.get('io');
    const socketInitialized = !!io;
    
    const uptimeSeconds = process.uptime();
    const uptimeMinutes = Math.floor(uptimeSeconds / 60);
    const uptimeHours = Math.floor(uptimeMinutes / 60);
    const uptimeFormatted = `${uptimeHours}h ${uptimeMinutes % 60}m ${Math.floor(uptimeSeconds % 60)}s`;
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      server: {
        uptime: uptimeFormatted,
        uptimeSeconds: Math.floor(uptimeSeconds),
      },
      database: {
        status: dbStatusText,
        connected: dbStatus === 1,
        collections: collections.sort(),
        collectionCount: collections.length,
      },
      socket: {
        initialized: socketInitialized,
      },
    });
  } catch (error) {
    console.error('[Health] Error:', error);
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

// Legacy health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.json({ 
    message: 'CodeCircle API Server', 
    status: 'running',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      onboarding: '/api/onboarding',
      friends: '/api/friends',
      techGroups: '/api/tech-groups',
      knowledge: '/api/knowledge'
    }
  });
});

// 404 handler - MUST be after all routes but before error handler
app.use((req, res) => {
  console.warn('[404] Route not found:', req.method, req.path);
  res.status(404).json({ 
    error: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// Global error handler middleware - MUST be after all routes and 404 handler
app.use((err, req, res, next) => {
  console.error('[Global Error Handler] Unhandled error:', err);
  console.error('[Global Error Handler] Stack:', err.stack);
  console.error('[Global Error Handler] Request:', req.method, req.path);
  
  // Don't expose internal errors to client
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message || 'Internal server error';
  
  res.status(err.status || 500).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// Start HTTP server
// MongoDB connection is handled in database.js import above
const PORT = process.env.PORT || 4000;

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

// Ensure database collections are initialized (MongoDB creates them automatically on first write)
const ensureCollections = async () => {
  try {
    if (mongoose.connection.readyState !== 1) {
      console.warn('[Collections] MongoDB not connected, skipping collection check');
      return;
    }
    
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    console.log('[Collections] Existing collections:', collectionNames.length > 0 ? collectionNames.join(', ') : 'none');
    
    // Collections will be created automatically on first document save
    // Models are already imported, so they're registered with mongoose
    console.log('[Collections] All models registered. Collections will be created automatically on first document save.');
  } catch (error) {
    console.error('[Collections] Error checking collections:', error);
    // Don't fail startup if collection check fails
  }
};

// Seed assessment questions into database if collection is empty
const seedAssessmentQuestions = async () => {
  try {
    if (mongoose.connection.readyState !== 1) {
      console.warn('[Seed] MongoDB not connected, skipping assessment questions seed');
      return;
    }

    const questionCount = await AssessmentQuestion.countDocuments();
    if (questionCount > 0) {
      console.log(`[Seed] Assessment questions already exist (${questionCount} questions), skipping seed`);
      return;
    }

    console.log('[Seed] Seeding assessment questions into database...');
    let seededCount = 0;

    // Get all tech groups to link questions
    const techGroups = await TechGroup.find({}).lean();
    console.log(`[Seed] Found ${techGroups.length} tech groups to link questions`);
    
    // Create a mapping of skill -> groupIds/slugs
    const skillToGroups = {};
    for (const group of techGroups) {
      const techSkill = extractTechSkillFromGroup(group);
      if (techSkill) {
        const skillKey = techSkill.toLowerCase().replace(/\s+/g, '-');
        const normalizedSkill = skillKey === 'full-stack' || skillKey === 'fullstack' ? 'fullstack' : skillKey;
        if (!skillToGroups[normalizedSkill]) {
          skillToGroups[normalizedSkill] = [];
        }
        // Create normalized slug from group name
        const groupSlug = (group.name || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        skillToGroups[normalizedSkill].push({
          groupId: group.groupId,
          slug: groupSlug || group.groupId.toLowerCase()
        });
      }
    }
    
    console.log('[Seed] Skill to groups mapping:', Object.keys(skillToGroups).map(s => `${s}: ${skillToGroups[s].length} groups`));
    
    // Iterate through ASSESSMENT_QUESTIONS and insert into database
    // Create questions linked to ALL groups of each skill (not just first group)
    for (const [skillKey, levels] of Object.entries(ASSESSMENT_QUESTIONS)) {
      const linkedGroups = skillToGroups[skillKey] || [];
      
      for (const [level, questions] of Object.entries(levels)) {
        if (Array.isArray(questions) && questions.length > 0) {
          for (const q of questions) {
            try {
              // Validate question has options
              if (!q.options || q.options.length < 2) {
                console.warn(`[Seed] Skipping question ${q.id} - insufficient options`);
                continue;
              }

              // Create question linked to ALL groups of this skill
              // Each group gets the same questions, but questions are explicitly linked to groups
              if (linkedGroups.length > 0) {
                // Link to ALL groups of this skill
                for (const linkedGroup of linkedGroups) {
                  // Check if this specific question-group combination already exists
                  const exists = await AssessmentQuestion.findOne({ 
                    question: q.question,
                    techGroupId: linkedGroup.groupId
                  });
                  if (exists) {
                    continue;
                  }

                  const questionDoc = new AssessmentQuestion({
                    questionId: `${q.id}-${linkedGroup.groupId}`, // Unique ID per group
                    techSkill: skillKey,
                    level: level,
                    question: q.question,
                    options: q.options || [],
                    correctAnswer: q.options[0] || '', // First option is correct answer
                    techGroupId: linkedGroup.groupId, // Link to specific group
                    techGroupSlug: linkedGroup.slug,
                    isActive: true,
                  });

                  await questionDoc.save();
                  seededCount++;
                }
              } else {
                // No groups found for this skill - create question with skill link only (fallback)
                const exists = await AssessmentQuestion.findOne({ 
                  questionId: q.id,
                  techSkill: skillKey,
                  techGroupId: { $exists: false }
                });
                if (exists) {
                  continue;
                }

                const questionDoc = new AssessmentQuestion({
                  questionId: q.id,
                  techSkill: skillKey,
                  level: level,
                  question: q.question,
                  options: q.options || [],
                  correctAnswer: q.options[0] || '',
                  techGroupId: null,
                  techGroupSlug: null,
                  isActive: true,
                });

                await questionDoc.save();
                seededCount++;
              }
            } catch (error) {
              console.error(`[Seed] Error seeding question ${q.id}:`, error.message);
            }
          }
        }
      }
    }
    
    // Verify each skill has at least 10 questions
    const skillCounts = {};
    for (const skillKey of Object.keys(ASSESSMENT_QUESTIONS)) {
      const count = await AssessmentQuestion.countDocuments({ techSkill: skillKey, isActive: true });
      skillCounts[skillKey] = count;
      if (count < 10) {
        console.warn(`[Seed] ⚠️ Skill "${skillKey}" has only ${count} questions (minimum 10 recommended)`);
      }
    }
    
    console.log('[Seed] Question counts by skill:', skillCounts);
    
    // Also verify questions linked to groups
    const groupCounts = {};
    for (const group of techGroups) {
      const groupSlug = (group.name || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const count = await AssessmentQuestion.countDocuments({ 
        $or: [
          { techGroupId: group.groupId },
          { techGroupSlug: groupSlug }
        ],
        isActive: true 
      });
      if (count > 0) {
        groupCounts[group.name] = count;
      }
    }
    console.log('[Seed] Questions linked to groups:', groupCounts);

    console.log(`[Seed] ✅ Seeded ${seededCount} assessment questions into database`);
  } catch (error) {
    console.error('[Seed] Error seeding assessment questions:', error);
    // Don't fail startup if seeding fails
  }
};

// Wait for MongoDB to connect before starting server
mongoose.connection.once('connected', async () => {
  console.log(`\n📡 MongoDB ready, preparing indexes...`);
  await ensureIndexes();
  console.log('[Collections] Ensuring collections are initialized...');
  await ensureCollections();
  console.log('📝 Seeding assessment questions...');
  await seedAssessmentQuestions();
  console.log('👑 Ensuring seeded admin accounts...');
  await ensureSeedAdmins();
  console.log('📦 Startup preparation complete. Starting HTTP server...');
  startHTTPServer();
});

// If already connected (e.g., reconnection), start server immediately
if (mongoose.connection.readyState === 1) {
  ensureIndexes()
    .then(() => ensureCollections())
    .then(() => seedAssessmentQuestions())
    .then(() => ensureSeedAdmins())
    .finally(() => startHTTPServer());
}

// Handle connection errors that prevent server start
mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err.message);
});

// Timeout fallback - start server even if DB connection is slow or fails
// (Allows API to work, but some features may be unavailable)
setTimeout(() => {
  if (!httpServer.listening) {
    console.log('\n⚠️  Starting server (MongoDB connection may still be in progress)...');
    console.log('   MongoDB readyState:', mongoose.connection.readyState);
    console.log('   (0=disconnected, 1=connected, 2=connecting, 3=disconnecting)');
    startHTTPServer();
  }
}, 3000);

// Emergency fallback - start server after 10 seconds regardless of MongoDB status
setTimeout(() => {
  if (!httpServer.listening) {
    console.log('\n🚨 Emergency server start (MongoDB connection timeout)...');
    startHTTPServer();
  }
}, 10000);

