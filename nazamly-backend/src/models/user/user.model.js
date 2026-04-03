const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    firebaseUid: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    displayName: String,
    photoURL: String,
    studentCardPhotoURL: String,
    accessStatus: {
      type: String,
      enum: ["active", "pending", "suspended"],
      default: "pending",
    },
    role: {
      type: String,
      default: "student",
    },
    // ── OLD BRANCH FIELDS (commented out — replaced by HEAD branch fields below) ──
    // cgpa: { type: Number, default: 0, min: 0, max: 5 },
    // completedHours: { type: Number, default: 0, min: 0, max: 200 },
    // termCourses: [
    //   { name: { type: String, required: true },
    //     courseCode: { type: String, required: true },
    //     creditHours: { type: Number, required: true, min: 1, max: 10 } },
    // ],
    // ── END OLD BRANCH FIELDS ───────────────────────────────────────────────────
    currentCGPA: {
      type: Number,
      default: 0,
      min: 0,
      max: 5.0,
    },
    earnedCreditHours: {
      type: Number,
      default: 0,
      min: 0,
    },
    pastSemesters: [
      {
        termName: {
          type: String,
          required: true,
          trim: true,
        },
        termGPA: {
          type: Number,
          required: true,
          min: 0,
          max: 5.0,
        },
      },
    ],
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
