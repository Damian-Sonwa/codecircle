import mongoose from 'mongoose';

const memberSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['admin', 'member'],
    default: 'member',
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
}, { _id: false });

const messageSchema = new mongoose.Schema(
  {
    messageId: {
      type: String,
      required: true,
      unique: true,
    },
    senderId: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['text', 'emoji', 'image', 'file', 'audio'],
      default: 'text',
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

const privateCircleSchema = new mongoose.Schema(
  {
    circleId: {
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
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 280,
      default: '',
    },
    createdBy: {
      type: String,
      required: true,
      index: true,
    },
    members: {
      type: [memberSchema],
      default: [],
      validate: {
        validator: function (v) {
          return v.length >= 1; // At least creator
        },
        message: 'Circle must have at least one member',
      },
    },
    type: {
      type: String,
      enum: ['private-circle'],
      default: 'private-circle',
      index: true,
    },
    messages: {
      type: [messageSchema],
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
    collection: 'privatecircles',
  }
);

// Indexes
privateCircleSchema.index({ createdBy: 1, type: 1 });
privateCircleSchema.index({ 'members.userId': 1 });

// Pre-save hook
privateCircleSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('PrivateCircle', privateCircleSchema);

