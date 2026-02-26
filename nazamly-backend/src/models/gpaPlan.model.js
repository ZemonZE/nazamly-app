const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const gpaPlanSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    required: true,
    unique: true,
    index: true,
    ref: 'User'
  },
  currentGPA: {
    type: Number,
    default: 0,
    min: 0,
    max: 5.0,
    set: v => Math.round(v * 1000) / 1000
  },
  completedCredits: {
    type: Number,
    default: 0,
    min: 0
  },
  targetGPA: {
    type: Number,
    required: true,
    min: 0,
    max: 5.0,
    set: v => Math.round(v * 1000) / 1000
  },
  targetCredits: {
    type: Number,
    required: true,
    min: 0
  },
  requiredFutureGPA: {
    type: Number,
    default: 0,
    min: 0,
    max: 5.0,
    set: v => Math.round(v * 1000) / 1000
  }
}, {
  timestamps: true,
  collection: 'gpaplans'
});

module.exports = model('GPAPlan', gpaPlanSchema);