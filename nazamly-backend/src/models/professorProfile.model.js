const mongoose = require('mongoose');
const { Schema, model } = mongoose;

/**
 * ProfessorProfile Schema
 * Stores the analyzed teaching and exam style of a professor for a specific course.
 * Used by the Question & Exams Generator to tailor output to match a professor's patterns.
 */
const professorProfileSchema = new Schema({
  courseId: {
    type: Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
    index: true
  },

  // Preferred question formats used by this professor (e.g., 'MCQ', 'True/False', 'Essay')
  preferredQuestionTypes: [{
    type: String,
    trim: true
  }],

  // Distribution of difficulty levels across the professor's exams (percentage-based)
  difficultyDistribution: {
    easy: { type: Number, min: 0, max: 100, default: 0 },
    medium: { type: Number, min: 0, max: 100, default: 0 },
    hard: { type: Number, min: 0, max: 100, default: 0 }
  },

  // Common phrases the professor uses to trick or mislead students in exams
  trickPhrases: [{
    type: String,
    trim: true
  }],

  // Average length of a question in the professor's exams (can be descriptive or numeric)
  averageQuestionLength: {
    type: Schema.Types.Mixed
  },

  // Flag to trigger re-analysis when new exams are uploaded for this professor
  styleProfileDirty: {
    type: Boolean,
    default: true
  },

  // Timestamp of the last successful style analysis run
  lastAnalyzedAt: {
    type: Date
  }
}, {
  timestamps: true
});

module.exports = model('ProfessorProfile', professorProfileSchema);
