const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const problemProgressSchema = new Schema({
  problemId:      { type: Schema.Types.ObjectId, ref: 'CodingProblem', required: true },
  status:         { type: String, enum: ['solved', 'attempted'], required: true },
  solvedAt:       { type: Date, default: null },
  lastLanguage:   { type: String, enum: ['cpp', 'js', 'emu8086', 'plsql'], default: null },
  showDifficulty: { type: Boolean, default: false },
}, { _id: false });

const studentProgressSchema = new Schema({
  studentId: { type: String, required: true },
  courseId:  { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  problems:  { type: [problemProgressSchema], default: [] },
}, { timestamps: true, collection: 'studentprogress' });

studentProgressSchema.index({ studentId: 1, courseId: 1 }, { unique: true });

module.exports = model('StudentProgress', studentProgressSchema);
