const mongoose = require('mongoose');

/**
 * Department Schema
 * Represents academic departments (e.g., Computer Science, Chemistry).
 */
const departmentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, unique: true, uppercase: true, trim: true }
}, { timestamps: true });

module.exports = mongoose.model('Department', departmentSchema);