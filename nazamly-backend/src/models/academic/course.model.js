const mongoose = require('mongoose');
const { Schema, model } = mongoose;

/**
 * Course Schema (Merged Version)
 * Combines teammate's naming conventions with NoSQL architectural improvements.
 */
const courseSchema = new Schema({
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
  
  // 🌟 my addition: specify course level (important for filtering)
  level: {
    type: Number,
    enum: [1, 2, 3, 4],
    required: true
  },
  
  // Merged teammate's credit hours field
  creditHours: {
    type: Number,
    required: true,
    min: 0,
    max: 4
  },
  difficulty: { type: Number, min: 1, max: 5, default: 3 },
  department: {
    type: String,
    trim: true,
    default: 'General'
  },


  // 🌟 Key addition: support cross-department courses (NoSQL array)
  // Replaced string with array of ObjectIDs referencing departments
  departments: [{
    type: Schema.Types.ObjectId,
    ref: 'Department',
    required: true
  }]
}, {
  timestamps: true,
  collection: 'courses' // Teammate manually set collection name, we kept it
});

module.exports = model("Course", courseSchema);