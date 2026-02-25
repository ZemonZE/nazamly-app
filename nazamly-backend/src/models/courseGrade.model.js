const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const courseGradeSchema = new Schema({
  courseGradeId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  gpaRecordId: {
    type: String,
    required: true,
    index: true,
    ref: 'GPARecord'
  },
  courseId: {
    type: String,
    required: true,
    index: true,
    ref: 'Course'
  },
  gradeLetter: {
    type: String,
    required: true,
    uppercase: true,
    enum: ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F', 'W', 'I', 'P', 'NP']
  },
  gradePoints: {
    type: Number,
    required: true,
    min: 0,
    max: 5.0,
    set: v => Math.round(v * 1000) / 1000
  },
  creditHours: {
    type: Number,
    required: true,
    min: 0
  }
}, {
  timestamps: true,
  collection: 'coursegrades'
});

module.exports = model('CourseGrade', courseGradeSchema);