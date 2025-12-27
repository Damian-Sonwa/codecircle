import mongoose from 'mongoose';

const privateChatSchema = new mongoose.Schema({
  chatId: {
    type: String,
    required: true,
    unique: true,
  },
  participants: [{
    type: String,
    required: true,
  }],
  messages: [{
    messageId: String,
    userId: String,
    username: String,
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
    attachments: [
      {
        url: { type: String, required: true },
        name: { type: String, default: '' },
        type: { type: String, default: 'application/octet-stream' },
        size: { type: Number, default: 0 },
      },
    ],
    voiceNote: {
      url: { type: String, default: null },
      mimeType: { type: String, default: null },
      duration: { type: Number, default: 0 },
      waveform: {
        type: [Number],
        default: [],
      },
    },
    timestamp: Date,
    reactions: mongoose.Schema.Types.Mixed,
    readBy: [String],
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    archivedAt: {
      type: Date,
      default: null,
    },
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('PrivateChat', privateChatSchema);


