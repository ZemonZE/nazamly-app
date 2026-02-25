const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const courseSchema = new Schema({
  courseId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  courseCode: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  courseName: {
    type: String,
    required: true,
    trim: true
  },
  creditHours: {
    type: Number,
    required: true,
    min: 0,
    max: 4
  },
  department: {
    type: String,
    trim: true,
    default: 'General'
  }
}, {
  timestamps: true,
  collection: 'courses'
});

module.exports = model("Course", courseSchema);