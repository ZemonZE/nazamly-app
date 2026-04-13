const mongoose = require('mongoose');

/**
 * ExtractedCourseSchema — Sub-document for each course row extracted from a transcript.
 * Embedded directly in TranscriptUploadSchema (no separate collection).
 */
const ExtractedCourseSchema = new mongoose.Schema({
    courseCode:        { type: String, required: true },   // Normalized: "CS411"
    rawCode:           { type: String, default: null },    // Original Arabic: "س411"
    courseName:        { type: String, default: null },
    mark:              { type: Number, min: 0, max: 100 },
    gradePoints:       { type: Number, min: 0, max: 5 },
    creditHours:       { type: Number, default: 3, min: 0, max: 6 },
    creditHoursFromDB: { type: Boolean, default: false },  // true = from Course collection
    semester:          { type: String, default: null },
    rating:            { type: String, default: null },    // Arabic: "جيد جداً"
    symbol:            { type: String, default: null },    // Arabic: "ب"
    isManuallyEdited:  { type: Boolean, default: false },
    isRetake:          { type: Boolean, default: false }
}, { _id: false });

/**
 * TranscriptUploadSchema — Tracks each transcript upload and its extraction results.
 * Linked to the User model via userId (ObjectId).
 */
const TranscriptUploadSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // File info
    fileName: { type: String, required: true },
    fileType: {
        type: String,
        enum: ['pdf', 'image'],
        required: true
    },

    // Processing
    status: {
        type: String,
        enum: ['processing', 'completed', 'failed'],
        default: 'processing',
        index: true
    },

    // Results
    extractedCourses: [ExtractedCourseSchema],
    semester:         { type: String, default: null },
    studentId:        { type: String, default: null },

    // GPA
    termGPA:          { type: Number, default: null },
    totalCreditHours: { type: Number, default: null },

    // Quality
    ocrConfidence:  { type: Number, min: 0, max: 1, default: null },
    ocrSource: {
        type: String,
        enum: ['pdf_text_layer', 'gemini_vision', 'gemma_vision', null],
        default: null
    },
    requiresReview: { type: Boolean, default: false },

    // Error
    errorMessage: { type: String, default: null },

    // Soft delete
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null }
}, {
    timestamps: true
});

// Compound index for efficient user history queries
TranscriptUploadSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('TranscriptUpload', TranscriptUploadSchema);
