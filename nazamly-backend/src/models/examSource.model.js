const mongoose = require('mongoose');

/**
 * ExamSource Schema
 * Represents an originally uploaded exam file before AI extraction.
 */
const examSourceSchema = new mongoose.Schema({
  courseInstanceId: { type: mongoose.Schema.Types.ObjectId, ref: 'CourseInstance', required: true, index: true },
  materialFileId: { type: mongoose.Schema.Types.ObjectId, ref: 'MaterialFile', required: true },
  
  examType: { type: String, enum: ['midterm', 'final', 'quiz'], required: true },
  processed: { type: Boolean, default: false },
  processedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('ExamSource', examSourceSchema);