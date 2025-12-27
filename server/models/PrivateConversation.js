import mongoose from 'mongoose';

const privateConversationSchema = new mongoose.Schema(
  {
    conversationId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    participants: {
      type: [String],
      required: true,
      validate: {
        validator: function (v) {
          return v.length === 2;
        },
        message: 'Private conversation must have exactly 2 participants',
      },
      index: true,
    },
    type: {
      type: String,
      enum: ['friend'],
      default: 'friend',
      index: true,
    },
    friendshipId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Friendship',
      required: true,
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

// Compound index to ensure unique conversation per friend pair
privateConversationSchema.index({ participants: 1 }, { unique: true });

// Pre-save hook to update updatedAt
privateConversationSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('PrivateConversation', privateConversationSchema);

