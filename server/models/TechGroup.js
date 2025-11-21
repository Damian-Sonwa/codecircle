import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    messageId: {
      type: String,
      required: true,
      unique: true,
    },
    groupId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      default: '',
      trim: true,
    },
    attachments: {
      type: [
        {
          url: { type: String, required: true },
          name: { type: String, default: '' },
          type: { type: String, default: 'application/octet-stream' },
          size: { type: Number, default: 0 },
        },
      ],
      default: [],
    },
    voiceNote: {
      url: { type: String, default: null },
      mimeType: { type: String, default: null },
      duration: { type: Number, default: 0 },
      waveform: {
        type: [Number],
        default: [],
      },
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    archivedAt: {
      type: Date,
      default: null,
    },
    reactions: {
      type: Map,
      of: [String],
      default: {},
    },
    readBy: {
      type: [String],
      default: [],
    },
  },
  { _id: false }
);

const techGroupSchema = new mongoose.Schema(
  {
    groupId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: 280,
    },
    type: {
      type: String,
      enum: ['community', 'classroom'],
      default: 'community',
      index: true,
    },
    createdBy: {
      type: String,
      required: true,
    },
    members: {
      type: [String],
      default: [],
    },
    admins: {
      type: [String],
      default: [],
    },
    joinRequests: {
      type: [
        {
          requestId: { type: String, required: true, unique: true },
          userId: { type: String, required: true },
          username: { type: String, default: '' },
          answers: { type: mongoose.Schema.Types.Mixed, default: {} },
          level: { type: String, default: '' },
          status: {
            type: String,
            enum: ['pending', 'approved', 'declined'],
            default: 'pending',
          },
          createdAt: { type: Date, default: Date.now },
          updatedAt: { type: Date, default: Date.now },
          decidedAt: { type: Date, default: null },
          decidedBy: { type: String, default: null },
        },
      ],
      default: [],
    },
    messages: {
      type: [messageSchema],
      default: [],
    },
    topics: {
      type: [String],
      default: [],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'techgroups',
  }
);

techGroupSchema.pre('save', function handleTimestamps(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('TechGroup', techGroupSchema);


