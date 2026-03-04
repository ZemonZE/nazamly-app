const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const sessionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
      index: true,
    },
    courseName: {
      type: String,
      required: [true, "Course name is required"],
      trim: true,
    },
    courseCode: {
      type: String,
      required: [true, "Course code is required"],
      trim: true,
      uppercase: true,
    },
    creditHours: {
      type: Number,
      required: [
        true,
        "Credit hours is required (crucial for GPA calculations)",
      ],
      min: [0, "Credit hours must be at least 0"],
      max: [4, "Credit hours cannot exceed 4"],
    },
    dayOfWeek: {
      type: String,
      required: [true, "Day of week is required"],
      enum: {
        values: [
          "Saturday",
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
        ],
        message: "{VALUE} is not a valid day. Must be Saturday-Thursday",
      },
    },
    startTime: {
      type: String,
      required: [true, "Start time is required"],
      match: [
        /^([01]\d|2[0-3]):([0-5]\d)$/,
        'Start time must be in "HH:mm" format (24-hour), e.g. "09:00"',
      ],
    },
    endTime: {
      type: String,
      required: [true, "End time is required"],
      match: [
        /^([01]\d|2[0-3]):([0-5]\d)$/,
        'End time must be in "HH:mm" format (24-hour), e.g. "11:30"',
      ],
      validate: {
        validator: function (value) {
          if (!this.startTime || !value) {
            return true;
          }
          const toMinutes = (time) => {
            const [h, m] = time.split(":").map(Number);
            return h * 60 + m;
          };
          return toMinutes(value) > toMinutes(this.startTime);
        },
        message: "End time must be after start time",
      },
    },
    groupNumber: {
      type: String,
      required: false,
      trim: true,
    },
    sessionType: {
      type: String,
      required: [true, "Session type is required"],
      enum: {
        values: ["Lecture", "Section", "Lab"],
        message: "{VALUE} is not valid. Must be Lecture, Section, or Lab",
      },
    },
    location: {
      type: String,
      required: [true, "Location is required"],
      trim: true,
      maxlength: [15, "Location cannot exceed 15 characters"],
    },
  },
  {
    timestamps: true,
  },
);

module.exports = model("Session", sessionSchema);
