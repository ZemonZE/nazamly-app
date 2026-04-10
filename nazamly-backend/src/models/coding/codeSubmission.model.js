const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const testResultSchema = new Schema({
  testCaseIndex: { type: Number, required: true },
  passed:        { type: Boolean, required: true },
  stdout:        { type: String, default: '' },
  stderr:        { type: String, default: '' },
  signal:        { type: String, default: null },
}, { _id: false });

const codeSubmissionSchema = new Schema({
  studentId:   { type: String, required: true },
  problemId:   { type: Schema.Types.ObjectId, ref: 'CodingProblem', required: true },
  language:    { type: String, enum: ['cpp', 'js', 'emu8086', 'plsql'], required: true },
  code:        { type: String, required: true },
  verdict:     { type: String, enum: ['AC', 'WA', 'ERROR'], required: true },
  testResults: { type: [testResultSchema], default: [] },
  isDeleted:   { type: Boolean, default: false },
  deletedAt:   { type: Date },
}, { timestamps: true, collection: 'codesubmissions' });

codeSubmissionSchema.index({ studentId: 1, problemId: 1, createdAt: -1 });
codeSubmissionSchema.index({ problemId: 1, createdAt: -1 });

module.exports = model('CodeSubmission', codeSubmissionSchema);
