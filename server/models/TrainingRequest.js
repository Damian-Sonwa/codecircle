import mongoose from 'mongoose';

const trainingRequestSchema = new mongoose.Schema(
  {
    requestId: {
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
    requestedCourse: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
    },
    motivation: {
      type: String,
      trim: true,
      default: '',
      maxlength: 600,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'declined'],
      default: 'pending',
      index: true,
    },
    decidedBy: {
      type: String,
      default: null,
    },
    decidedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('TrainingRequest', trainingRequestSchema);
