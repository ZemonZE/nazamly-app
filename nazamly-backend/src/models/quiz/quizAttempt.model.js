const mongoose = require('mongoose');
const { Schema, model } = mongoose;

/**
 * QuizAttempt Schema
 * Represents a student's session.
 * Updated to support partial grading for AI-graded essay questions.
 */
const quizAttemptSchema = new Schema({
  // Polymorphic type to separate fixed-bank vs dynamic AI snapshots
  quizType: { type: String, enum: ['STANDARD', 'AI_GENERATED'], default: 'STANDARD' },

  // Shared attributes
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  
  // Legacy / Standard fields
  quizTemplateId: { type: Schema.Types.ObjectId, ref: 'QuizTemplate', default: null }, // Nullable for custom practice
  courseInstanceId: { 
    type: Schema.Types.ObjectId, 
    ref: 'CourseInstance', 
    required: function() { return this.quizType === 'STANDARD'; }, 
    index: true 
  },
  
  mode: { 
    type: String, 
    enum: ['custom', 'mock', 'practice'], 
    required: function() { return this.quizType === 'STANDARD'; } 
  },
  
  // Total score achieved in the entire attempt
  score: { type: Number, default: 0 },
  totalQuestions: { type: Number, required: true },
  
  configSnapshot: { type: Schema.Types.Mixed }, // Stores config like selected chapters, difficulty, etc.
  
  // Embedded array for answers (NoSQL Optimization) - Legacy STANDARD quizzes
  answers: [{
    generatedQuestionId: { type: Schema.Types.ObjectId, ref: 'GeneratedQuestion', required: true },
    studentAnswer: { type: String, trim: true },
    isCorrect: { type: Boolean },
    pointsAwarded: { type: Number, default: 0 },
    aiFeedback: { type: String, trim: true },
    timeSpentSeconds: { type: Number, default: 0 }
  }],

  // ── AI_GENERATED fields ──
  // Linking directly to Course since AI generated quizzes might not map nicely to a specific Instance always
  courseId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Course',
    required: function() { return this.quizType === 'AI_GENERATED'; },
    index: true
  },
  
  // Full snapshot of the generated questions since they are ephemeral
  questionsSnapshot: [{
    questionText: { type: String, required: true },
    options: [{ type: String }],
    correctAnswer: { type: String, required: true },
    studentAnswer: { type: String },
    isCorrect: { type: Boolean, default: false },
    explanation: { type: String, default: '' },
    difficulty: { type: Number },
    derivedFromConcept: { type: String }
  }],

  startedAt: { type: Date, default: Date.now },
  submittedAt: { type: Date }
}, { timestamps: true });

module.exports = model('QuizAttempt', quizAttemptSchema);