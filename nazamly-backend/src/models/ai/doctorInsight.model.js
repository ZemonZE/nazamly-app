const mongoose = require('mongoose');

/**
 * DoctorInsight Schema
 * AI-generated analytics mapping the instructor's mindset and exam patterns.
 */
const doctorInsightSchema = new mongoose.Schema({
  courseInstanceId: { type: mongoose.Schema.Types.ObjectId, ref: 'CourseInstance', required: true, index: true },
  
  // Mixed types (JSON objects) for dynamic AI data
  topChapters: { type: mongoose.Schema.Types.Mixed }, // e.g., { "Chapter 1": "40%", "Chapter 2": "60%" }
  preferredQuestionTypes: { type: mongoose.Schema.Types.Mixed }, 
  
  avgDifficulty: { type: String },
  focusStyle: { type: String }, // e.g., "Theoretical", "Problem-solving"
  summaryText: { type: String, required: true },
  
  generatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('DoctorInsight', doctorInsightSchema);