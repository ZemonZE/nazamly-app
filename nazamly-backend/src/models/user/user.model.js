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
    role: {
      type: String,
      default: "student",
    },
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
