import mongoose from 'mongoose';

const friendshipSchema = new mongoose.Schema(
  {
    requesterId: {
      type: String,
      required: true,
      index: true,
    },
    recipientId: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
      index: true,
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
  }
);

// Compound index to ensure unique friendship pairs
friendshipSchema.index({ requesterId: 1, recipientId: 1 }, { unique: true });

// Index for efficient queries
friendshipSchema.index({ requesterId: 1, status: 1 });
friendshipSchema.index({ recipientId: 1, status: 1 });

// Pre-save hook to update updatedAt
friendshipSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('Friendship', friendshipSchema);

