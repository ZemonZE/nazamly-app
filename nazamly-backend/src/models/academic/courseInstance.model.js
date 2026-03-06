const mongoose = require('mongoose');

/**
 * CourseInstance Schema
 * The crucial link between a Course, the teaching Doctor, and the specific academic term.
 * Materials are linked here to isolate term-specific content.
 */
const courseInstanceSchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true, index: true },
  
  academicYear: { type: String, required: true }, // Format: "2025/2026"
  semester: { type: String, enum: ['Fall', 'Spring'], required: true }
}, { timestamps: true });

// Compound index to prevent duplicating the same course instance in the same semester
courseInstanceSchema.index({ courseId: 1, doctorId: 1, academicYear: 1, semester: 1 }, { unique: true });

module.exports = mongoose.model('CourseInstance', courseInstanceSchema);