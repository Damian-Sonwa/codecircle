import mongoose from 'mongoose';

const adminLogSchema = new mongoose.Schema(
  {
    logId: {
      type: String,
      required: true,
      unique: true,
    },
    adminId: {
      type: String,
      required: true,
    },
    adminUsername: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      required: true,
      enum: ['suspend', 'reinstate', 'delete'],
    },
    targetUserId: {
      type: String,
      required: true,
    },
    targetUsername: {
      type: String,
      required: true,
    },
    details: {
      type: String,
      default: '',
      maxlength: 500,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: 'adminlogs',
  }
);

export default mongoose.model('AdminLog', adminLogSchema);





