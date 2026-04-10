const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const testCaseSchema = new Schema({
  input:          { type: String, required: true },
  expectedOutput: { type: String, required: true },
  visible:        { type: Boolean, default: false },
}, { _id: true });

const codingProblemSchema = new Schema({
  title:              { type: String, required: true, trim: true },
  descriptionMd:      { type: String, required: true },
  testCases:          { type: [testCaseSchema], required: true },
  supportedLanguages: { type: [{ type: String, enum: ['cpp', 'js', 'emu8086', 'plsql'] }], required: true },
  topic:              { type: String, required: true, trim: true },
  tags:               { type: [String], default: [] },
  courseId:           { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  estimatedMinutes:   { type: Number, required: true, min: 1 },
  difficulty:         { type: Number, enum: [1, 2, 3], required: true }, // 1=Easy, 2=Medium, 3=Hard
  acCount:            { type: Number, default: 0 },
  isDeleted:          { type: Boolean, default: false },
  deletedAt:          { type: Date },
}, { timestamps: true, collection: 'codingproblems' });

codingProblemSchema.index({ courseId: 1, topic: 1, isDeleted: 1 });
codingProblemSchema.index({ courseId: 1, acCount: -1 });

module.exports = model('CodingProblem', codingProblemSchema);
