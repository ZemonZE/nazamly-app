// src/routes/gpa.routes.js
const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');

// 1. Import Middlewares
const authMiddleware = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');
const {
    validateTermCalculation,
    validateTargetStrategy
} = require('../middlewares/gpa.validator');

// 2. Import Controllers (all from gpa.controller.js — single source of truth)
const {
    calculateCurrentTerm,
    generateTargetPlan,
    getTermCourses,
    addTermCourse,
    removeTermCourse,
    uploadTranscript,
    getAllTranscripts,
    getTranscriptById,
    updateTranscript,
    deleteTranscript,
    getGPAHistory
} = require('../controllers/gpa.controller');

// 3. Rate limiter for transcript uploads: 5 per hour per user
const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,  // 1 hour window
    max: 5,
    keyGenerator: (req) => req.user?.uid || ipKeyGenerator(req),
    message: {
        success: false,
        message: 'Upload limit reached. Maximum 5 uploads per hour.',
        code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// 4. Apply authentication to all routes in this file
// This guarantees that 'req.user' will be available in our controllers
router.use(authMiddleware);

/**
 * @route   POST /api/gpa/calculate
 * @desc    Calculates the term GPA and the new expected CGPA
 * @access  Private
 */
router.post(
    '/calculate',
    validateTermCalculation,
    calculateCurrentTerm
);

/**
 * @route   POST /api/gpa/target-strategy
 * @desc    Generates a smart study plan to reach a specific target CGPA
 * @access  Private
 */
router.post(
    '/target-strategy',
    validateTargetStrategy,
    generateTargetPlan
);

/**
 * @route   GET /api/gpa/my-courses
 * @desc    Get the authenticated user's current term courses
 * @access  Private
 */
router.get('/my-courses', getTermCourses);

/**
 * @route   POST /api/gpa/my-courses
 * @desc    Add a course to the user's current term
 * @access  Private
 */
router.post('/my-courses', addTermCourse);

/**
 * @route   DELETE /api/gpa/my-courses/:courseId
 * @desc    Remove a course from the user's current term
 * @access  Private
 */
router.delete('/my-courses/:courseId', removeTermCourse);

// ── Transcript Endpoints ──

/**
 * @route   POST /api/gpa/upload-transcript
 * @desc    Upload an image/PDF transcript → OCR extract → enrich → calculate GPA
 * @access  Private (rate limited: 5 uploads/hour)
 */
router.post(
    '/upload-transcript',
    uploadLimiter,
    upload.single('transcript'),
    uploadTranscript
);

/**
 * @route   GET /api/gpa/transcripts
 * @desc    Get all transcript histories for the signed-in student
 * @access  Private
 */
router.get('/transcripts', getAllTranscripts);

/**
 * @route   GET /api/gpa/transcripts/:id
 * @desc    Get a specific transcript by ID (includes extracted courses)
 * @access  Private
 */
router.get('/transcripts/:id', getTranscriptById);

/**
 * @route   PATCH /api/gpa/transcripts/:id
 * @desc    Manually correct courses and recalculate GPA
 * @access  Private
 */
router.patch('/transcripts/:id', updateTranscript);

/**
 * @route   DELETE /api/gpa/transcripts/:id
 * @desc    Soft-delete a specific transcript record
 * @access  Private
 */
router.delete('/transcripts/:id', deleteTranscript);

/**
 * @route   GET /api/gpa/history
 * @desc    GPA trend over time (completed transcripts + cumulative GPA)
 * @access  Private
 */
router.get('/history', getGPAHistory);

// ── Error handler for Multer (MUST be 4-arg to intercept errors) ─────────
router.use((err, req, res, next) => {
    console.error('Multer/Upload Error:', err); // <= Added so we can see the exact error in the terminal
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            success: false,
            message: `File is too large. Max size is ${process.env.MAX_FILE_SIZE_MB || 10}MB.`
        });
    }
    if (err.code === 'INVALID_FILE_TYPE') {
        return res.status(400).json({ success: false, message: err.message });
    }
    if (err instanceof require('multer').MulterError) {
        return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
    }
    next(err);
});

module.exports = router;