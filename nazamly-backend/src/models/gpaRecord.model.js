const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const gpaRecordSchema = new Schema({
  gpaRecordId: {
    type: Schema.Types.ObjectId,
    required: true,
    unique: true,
    index: true
  },
  semesterId: {
    type: Schema.Types.ObjectId,
    required: true,
    unique: true,
    index: true,
    ref: 'Semester'
  },
  userId: {
    type: Schema.Types.ObjectId,
    required: true,
    index: true,
    ref: 'User'
  },
  semesterGPA: {
    type: Number,
    default: 0,
    min: 0,
    max: 5.0,
    set: v => Math.round(v * 1000) / 1000
  },
  totalCredits: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true,
  collection: 'gparecords'
});

module.exports = model('GPARecord', gpaRecordSchema);