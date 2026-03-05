const mongoose = require('mongoose');
const { Schema, model } = mongoose;


const semesterSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'User',
    index: true
  },
  semesterNumber: {
    type: Number,
    required: true,
    min: 1
  },
  type: {
    type: String,
    required: true,
    enum: ['planned', 'completed', 'none'],
    default: 'none'
  },
  year: {
    type: Number,
    required: true,
    min: 1900,
    max: 2100
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  }
}, {
  timestamps: true,
  collection: 'semesters'
});

semesterSchema.index({ userId: 1, semesterNumber: 1 }, { unique: true });
semesterSchema.index({ userId: 1, year: 1, semesterNumber: 1 });

module.exports = model('Semester', semesterSchema);
