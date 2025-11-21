import mongoose from 'mongoose';

const violationSchema = new mongoose.Schema(
  {
    violationId: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
    },
    messageId: {
      type: String,
      required: false,
    },
    groupId: {
      type: String,
      required: false,
    },
    chatId: {
      type: String,
      required: false,
    },
    offendingContent: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    triggerWord: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['warning', 'auto-suspended'],
      default: 'warning',
    },
  },
  {
    collection: 'violations',
  }
);

export default mongoose.model('Violation', violationSchema);





