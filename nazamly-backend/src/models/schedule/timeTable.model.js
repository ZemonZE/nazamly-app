const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const timeTableSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User is required'],
        index: true
    },
    SemesterId: {
        type: Schema.Types.ObjectId,
        ref: 'Semester',
        required: [true, 'Semester is required'],
        index: true
    },
    sessions: [
      {
        type: Schema.Types.ObjectId,
        ref: "Session",
      },
    ],
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true,
        maxlength: [100, 'Title cannot exceed 100 characters']
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
    sourceType: {
        type: String,
        enum: ['manual', 'AI_generated'],
        required: [true, 'Source type is required'],
        default: 'manual'
    },
    aiInputRaw: {
        type: String,
        required: false,
        trim: true
    }
},
{
    timestamps: true,
    collection: 'timeTables'
});

module.exports = model("TimeTable", timeTableSchema);