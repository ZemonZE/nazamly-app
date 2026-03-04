const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const scheduleSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
      index: true,
    },
    timeTableId: {
      type: Schema.Types.ObjectId,
      ref: "TimeTable",
      required: [true, "TimeTable is required"],
      index: true,
    },
    sessions: [
      {
        type: Schema.Types.ObjectId,
        ref: "Session",
      },
    ],
    title: {
      type: String,
      trim: true,
      maxlength: [50, "Title cannot exceed 50 characters"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    totalCreditHours: {
      type: Number,
      default: 0,
      min: [0, "Total credit hours cannot be negative"],
      max: [19, "Total credit hours cannot exceed 19"],
    },
  },
  {
    timestamps: true,
    collection: "schedules",
  },
);

module.exports = model("Schedule", scheduleSchema);
