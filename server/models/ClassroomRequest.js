import mongoose from 'mongoose';

const classroomRequestSchema = new mongoose.Schema(
  {
    requestId: {
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
      maxlength: 500,
    },
    createdBy: {
      type: String,
      required: true,
      index: true,
    },
    createdByUsername: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'declined'],
      default: 'pending',
      index: true,
    },
    approvedBy: {
      type: String,
      default: null,
    },
    approvedByUsername: {
      type: String,
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    adminNotes: {
      type: String,
      default: '',
      maxlength: 500,
    },
    groupId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'classroomrequests',
  }
);

export default mongoose.model('ClassroomRequest', classroomRequestSchema);


