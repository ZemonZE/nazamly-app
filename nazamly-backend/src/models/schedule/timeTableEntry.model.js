const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const timeTableEntrySchema = new Schema({
    timeTableId: {
        type: Schema.Types.ObjectId,
        ref: 'TimeTable',
        required: [true, 'TimeTable is required'],
        index: true
    },
    courseId: {
        type: Schema.Types.ObjectId,
        ref: 'Course',
        required: [true, 'Course is required'],
        index: true
    },
    dayOfWeek: {
        type: Number,
        required: [true, 'Day of week is required'],
        min: [0, 'Day of week must be between 0 (Sunday) and 6 (Saturday)'],
        max: [6, 'Day of week must be between 0 (Sunday) and 6 (Saturday)'],
        validate: {
            validator: Number.isInteger,
            message: 'Day of week must be an integer'
        }
    },
    startTime: {
        type: String,
        required: [true, 'Start time is required'],
        match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Start time must be in "HH:mm" format (24-hour)']
    },
    endTime: {
        type: String,
        required: [true, 'End time is required'],
        match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'End time must be in "HH:mm" format (24-hour)'],
        
        // Custom validator to ensure end time is after start time
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
    location: {
        type: String,
        required: false,
        trim: true,
        maxlength: [100, 'Location cannot exceed 100 characters']
    }
},
{
    timestamps: true,
    collection: 'timeTableEntries'
});

module.exports = model("TimeTableEntry", timeTableEntrySchema);