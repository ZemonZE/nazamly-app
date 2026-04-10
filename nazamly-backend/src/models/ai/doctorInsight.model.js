const mongoose = require('mongoose');

/**
 * DoctorInsight Schema
 * AI-generated analytics mapping the instructor's mindset and exam patterns.
 */
const doctorInsightSchema = new mongoose.Schema({
  courseInstanceId: { type: mongoose.Schema.Types.ObjectId, ref: 'CourseInstance', index: true },

  // Denormalized for direct querying without populate chain
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true, index: true },
  courseId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Course',  required: true, index: true },

  // AI-analyzed style profile for this doctor/course combo
  preferredQuestionTypes: { type: mongoose.Schema.Types.Mixed },
  difficultyDistribution:  { type: mongoose.Schema.Types.Mixed },
  trickPhrases:            { type: mongoose.Schema.Types.Mixed },
  averageQuestionLength:   { type: String },

  // Legacy / supplementary insight fields
  topChapters:  { type: mongoose.Schema.Types.Mixed },
  focusStyle:   { type: String },
  summaryText:  { type: String, required: true },

  generatedAt: { type: Date, default: Date.now }
});

// Compound index: one insight doc per doctor/course pair
doctorInsightSchema.index({ doctorId: 1, courseId: 1 }, { unique: true });

module.exports = mongoose.model('DoctorInsight', doctorInsightSchema);