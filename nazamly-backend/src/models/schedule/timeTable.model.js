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
    entries: [
      {
        type: Schema.Types.ObjectId,
        ref: "TimeTableEntry",
      },
    ],
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true,
        maxlength: [100, 'Title cannot exceed 100 characters']
    },
    entries: [
      {
        type: Schema.Types.ObjectId,
        ref: "TimeTableEntry",
      },
    ],
    isActive: {
        type: Boolean,
        default: false
    },
    totalCreditHours: {
        type: Number,
        required: [true, 'Total credit hours is required'],
        min: [0, 'Total credit hours must be at least 0'],
        max: [19, 'Total credit hours cannot exceed 19']
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