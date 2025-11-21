import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  password: {
    type: String,
    required: false, // Not required for OAuth users
  },
  email: {
    type: String,
    required: false,
    trim: true,
  },
  avatar: {
    type: String,
    required: false,
  },
  provider: {
    type: String,
    enum: ['local', 'google', 'github'],
    default: 'local',
  },
  providerId: {
    type: String,
    required: false, // OAuth provider ID
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'superadmin'],
    default: 'user',
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'deleted'],
    default: 'active',
  },
  suspendedAt: {
    type: Date,
    default: null,
  },
  deletedAt: {
    type: Date,
    default: null,
  },
  violationCount: {
    type: Number,
    default: 0,
  },
  lastViolationAt: {
    type: Date,
    default: null,
  },
  online: {
    type: Boolean,
    default: false,
  },
  lastSeen: {
    type: Date,
    default: Date.now,
  },
  onboardingCompleted: {
    type: Boolean,
    default: false,
  },
  skills: {
    type: [String],
    default: [],
  },
  skillLevel: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Professional'],
    default: 'Beginner',
  },
  onboardingAnswers: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  friends: {
    type: [String],
    default: [],
  },
  friendRequests: {
    type: [String],
    default: [],
  }, // incoming requests (userIds)
  sentFriendRequests: {
    type: [String],
    default: [],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('User', userSchema);

