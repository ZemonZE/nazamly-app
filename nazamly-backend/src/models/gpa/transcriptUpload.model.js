const mongoose = require('mongoose');

const ExtractedCourseSchema = new mongoose.Schema({
    courseCode: { type: String, required: true },
    mark: { type: Number, required: true },
    gradePoints: { type: Number, required: true },
    creditHours: { type: Number, required: true },
    semester: { type: String }
}, { _id: false });

const TranscriptUploadSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    fileName: { type: String, required: true },
    fileUrl: { type: String }, // Can be used later if we upload to S3/Firebase
    fileType: { 
        type: String, 
        enum: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
        required: true 
    },
    status: { 
        type: String, 
        enum: ['pending', 'processing', 'completed', 'failed'], 
        default: 'pending' 
    },
    extractedCourses: [ExtractedCourseSchema],
    termGPA: { type: Number },
    totalCreditHours: { type: Number },
    ocrConfidence: { type: Number },
    errorMessage: { type: String }
}, { 
    timestamps: true 
});

module.exports = mongoose.model('TranscriptUpload', TranscriptUploadSchema);
