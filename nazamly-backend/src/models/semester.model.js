const mongoose = require('mongoose');
const { Schema, model } = mongoose;


const semesterSchema = new Schema({
  userId: {
    type: String,
    required: true,
    ref: 'User'
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
  collection: 'semesters',
  _id: false
});

semesterSchema.pre('validate', function (next) {
    if (!this._id) {
        this._id = `${this.userId}_${this.semesterNumber}`;
    }
    next();
});

semesterSchema.index({ userId: 1, semesterNumber: 1 }, { unique: true });
semesterSchema.index({ userId: 1, year: 1, semesterNumber: 1 });

module.exports = model('Semester', semesterSchema);
