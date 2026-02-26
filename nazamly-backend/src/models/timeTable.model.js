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
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true,
        maxlength: [100, 'Title cannot exceed 100 characters']
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