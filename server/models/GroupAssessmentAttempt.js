import mongoose from 'mongoose';

const groupAssessmentAttemptSchema = new mongoose.Schema(
  {
    attemptId: {
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
    groupId: {
      type: String,
      required: true,
      index: true,
    },
    techSkill: {
      type: String,
      required: true,
    },
    attemptNumber: {
      type: Number,
      required: true,
      min: 1,
      max: 2,
    },
    questions: [
      {
        questionId: String,
        question: String,
        selectedAnswer: String,
        correctAnswer: String,
        isCorrect: Boolean,
      },
    ],
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    passed: {
      type: Boolean,
      required: true,
    },
    completedAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
    collection: 'groupassessmentattempts',
  }
);

// Compound index to ensure only 2 attempts per user per group
groupAssessmentAttemptSchema.index({userId: 1, groupId: 1});

export default mongoose.model('GroupAssessmentAttempt', groupAssessmentAttemptSchema);



