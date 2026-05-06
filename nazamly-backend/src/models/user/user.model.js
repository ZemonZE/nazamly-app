const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  firebaseUid: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  displayName: String,
  photoURL: String,
  accessStatus: { type: String, enum: ["active", "pending", "blocked"], default: "pending" },
  role: { type: String, default: "student" },

  // Student onboarding / academic profile fields
  studentCode: { type: String, unique: true, sparse: true, trim: true },
  academicYear: { type: Number, min: 1, max: 5 },
  department: { type: String, trim: true, default: 'General' },
  isProfileComplete: { type: Boolean, default: false },

  // GPA & Schedule fields
  cgpa: { type: Number, default: 0, min: 0, max: 5 },
  completedHours: { type: Number, default: 0, min: 0, max: 200 },
  termCourses: [{
    name: { type: String, required: true },
    courseCode: { type: String, required: true },
    creditHours: { type: Number, required: true, min: 1, max: 10 },
  }],
  // Soft-delete support (required by Base_Repo)
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
