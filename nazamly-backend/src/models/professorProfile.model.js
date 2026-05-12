const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const professorProfileSchema = new Schema({
  courseId: {
    type: Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
    index: true
  },

  preferredQuestionTypes: [{
    type: String,
    trim: true
  }],

  difficultyDistribution: {
    easy: { type: Number, min: 0, max: 100, default: 0 },
    medium: { type: Number, min: 0, max: 100, default: 0 },
    hard: { type: Number, min: 0, max: 100, default: 0 }
  },

  trickPhrases: [{
    type: String,
    trim: true
  }],

  averageQuestionLength: {
    type: Schema.Types.Mixed
  },

  styleProfileDirty: {
    type: Boolean,
    default: true
  },

  lastAnalyzedAt: {
    type: Date
  }
}, {
  timestamps: true
});

module.exports = model('ProfessorProfile', professorProfileSchema);
