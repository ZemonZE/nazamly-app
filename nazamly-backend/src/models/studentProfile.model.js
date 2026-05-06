const mongoose = require('mongoose');
const { Schema, model } = mongoose;

/**
 * Student Profile Schema
 * Stores student registration data for the Schedule Generator.
 * registeredCourses references the existing Course model for population.
 */
const studentProfileSchema = new Schema({
  fullName: {
    type: String,
    required: true,
    trim: true
  },

  studentCode: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },

  completedHours: {
    type: Number,
    required: true,
    min: 0
  },

  cgpa: {
    type: Number,
    required: true,
    min: 0,
    max: 5.0
  },

  academicYear: {
    type: Number,
    min: 1,
    max: 5
  },

  department: {
    type: String,
    required: true,
    trim: true,
    default: 'General'
  },

  // References the existing Course model for population by the Schedule Generator
  registeredCourses: [{
    type: Schema.Types.ObjectId,
    ref: 'Course'
  }]
}, {
  timestamps: true
});

module.exports = model("StudentProfile", studentProfileSchema);
