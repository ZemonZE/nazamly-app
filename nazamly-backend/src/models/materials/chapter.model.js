const mongoose = require('mongoose');

/**
 * Chapter Schema
 * Represents course syllabus breakdown for a specific instance.
 */
const chapterSchema = new mongoose.Schema({
  courseInstanceId: { type: mongoose.Schema.Types.ObjectId, ref: 'CourseInstance', required: true, index: true },
  materialFileId: { type: mongoose.Schema.Types.ObjectId, ref: 'MaterialFile', required: true }, // e.g., Chapter Slides
  title: { type: String, required: true, trim: true }
}, { timestamps: true });

module.exports = mongoose.model('Chapter', chapterSchema);