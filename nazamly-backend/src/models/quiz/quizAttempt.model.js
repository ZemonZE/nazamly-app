const mongoose = require('mongoose');
const { Schema, model } = mongoose;

/**
 * QuizAttempt Schema
 * Represents a student's session.
 * Updated to support partial grading for AI-graded essay questions.
 */
const quizAttemptSchema = new Schema({
  quizTemplateId: { type: Schema.Types.ObjectId, ref: 'QuizTemplate', default: null }, // Nullable for custom practice
  courseInstanceId: { type: Schema.Types.ObjectId, ref: 'CourseInstance', required: true, index: true },
  // userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  
  mode: { type: String, enum: ['custom', 'mock', 'practice'], required: true },
  
  // Total score achieved in the entire attempt
  score: { type: Number, default: 0 },
  totalQuestions: { type: Number, required: true },
  
  configSnapshot: { type: Schema.Types.Mixed }, // Stores config like selected chapters, difficulty, etc.
  
  // Embedded array for answers (NoSQL Optimization)
  answers: [{
    generatedQuestionId: { type: Schema.Types.ObjectId, ref: 'GeneratedQuestion', required: true },
    
    studentAnswer: { type: String, trim: true },
    
    // Kept for simple MCQ/TF checks
    isCorrect: { type: Boolean },
    
    // Crucial for essay questions that get partial credit (e.g., 3 out of 5 points)
    pointsAwarded: { type: Number, default: 0 },
    
    // AI-generated feedback explaining why the student got this specific score
    aiFeedback: { type: String, trim: true },
    
    timeSpentSeconds: { type: Number, default: 0 }
  }],

  startedAt: { type: Date, default: Date.now },
  submittedAt: { type: Date }
}, { timestamps: true });

module.exports = model('QuizAttempt', quizAttemptSchema);