const mongoose = require('mongoose');

/**
 * Doctor Schema
 * Represents the instructors teaching the courses.
 */
const doctorSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, lowercase: true, trim: true } // Optional contact info
}, { timestamps: true });

module.exports = mongoose.model('Doctor', doctorSchema);