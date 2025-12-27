import mongoose from 'mongoose';

const liveSessionApplicationSchema = new mongoose.Schema(
  {
    applicationId: {
      type: String,
      required: true,
      unique: true,
      index: true,
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
    techSkill: {
      type: String,
      required: true,
      index: true,
    },
    message: {
      type: String,
      default: '',
      maxlength: 500,
    },
    availability: {
      type: String,
      default: '',
      maxlength: 200,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
      index: true,
    },
    roomId: {
      type: String,
      default: null,
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
    rejectedAt: {
      type: Date,
      default: null,
    },
    adminNotes: {
      type: String,
      default: '',
      maxlength: 500,
    },
  },
  {
    timestamps: true,
    collection: 'livesessionapplications',
  }
);

export default mongoose.model('LiveSessionApplication', liveSessionApplicationSchema);



