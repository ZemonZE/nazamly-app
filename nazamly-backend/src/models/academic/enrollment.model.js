const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Enrollment Schema
 * Tracks a student's enrollment in a specific course instance during a semester.
 * References CourseInstance (which already encapsulates Course + Doctor + academic term).
 */
const enrollmentSchema = new Schema({
  userId:           { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  courseInstanceId:  { type: Schema.Types.ObjectId, ref: 'CourseInstance', required: true, index: true },
  semesterId:       { type: Schema.Types.ObjectId, ref: 'Semester', required: true, index: true },

  status: {
    type: String,
    required: true,
    enum: ['enrolled', 'dropped', 'completed'],
    default: 'enrolled'
  },

  enrolledAt: { type: Date, default: Date.now }
}, { timestamps: true, collection: 'enrollments' });

// Prevent duplicate enrollment in the same course instance within the same semester
enrollmentSchema.index(
  { userId: 1, courseInstanceId: 1, semesterId: 1 },
  { unique: true }
);

module.exports = mongoose.model('Enrollment', enrollmentSchema);
