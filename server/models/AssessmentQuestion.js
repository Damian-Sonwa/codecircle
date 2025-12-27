import mongoose from 'mongoose';

const assessmentQuestionSchema = new mongoose.Schema(
  {
    questionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    techSkill: {
      type: String,
      required: true,
      enum: ['cybersecurity', 'fullstack', 'frontend', 'backend', 'data-science', 'cloud', 'ui/ux', 'ai/ml'],
      index: true,
    },
    techGroupId: {
      type: String,
      index: true,
      sparse: true, // Allow null values
    },
    techGroupSlug: {
      type: String,
      index: true,
      sparse: true, // Allow null values
    },
    level: {
      type: String,
      required: true,
      enum: ['Beginner', 'Intermediate', 'Professional'],
      index: true,
    },
    question: {
      type: String,
      required: true,
      trim: true,
    },
    options: {
      type: [String],
      required: true,
      validate: {
        validator: function(v) {
          return v.length >= 2 && v.length <= 6; // At least 2 options, max 6
        },
        message: 'Question must have between 2 and 6 options',
      },
    },
    correctAnswer: {
      type: String,
      required: true,
      validate: {
        validator: function(v) {
          return this.options.includes(v);
        },
        message: 'Correct answer must be one of the options',
      },
    },
    explanation: {
      type: String,
      trim: true,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
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
    collection: 'assessmentquestions',
  }
);

// Compound indexes for efficient queries
assessmentQuestionSchema.index({ techSkill: 1, level: 1, isActive: 1 });
assessmentQuestionSchema.index({ techGroupId: 1, isActive: 1 });
assessmentQuestionSchema.index({ techGroupSlug: 1, isActive: 1 });

// Pre-save hook to update updatedAt
assessmentQuestionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('AssessmentQuestion', assessmentQuestionSchema);

