const mongoose = require('mongoose');

/**
 * ArchivedQuestion Schema
 * Represents historical past exam questions linked to specific course lectures.
 */
const archivedQuestionSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
    index: true
  },
  linkedLectureId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MaterialFile',
    required: true,
    index: true
  },
  questionText: {
    type: String,
    required: true,
    trim: true
  },
  options: [{
    type: String,
    trim: true
  }],
  correctAnswer: {
    type: String,
    required: true,
    trim: true
  },
  examType: {
    type: String,
    enum: ['midterm', 'final'],
    required: true
  },
  year: {
    type: Number,
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('ArchivedQuestion', archivedQuestionSchema);
