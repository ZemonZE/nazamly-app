// src/routes/questions.routes.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const requireActiveUser = require('../middlewares/requireActiveUser.middleware');
const questionsController = require('../controllers/questions.controller');

// All question routes require a logged-in, verified (active) user
router.use(authMiddleware);
router.use(requireActiveUser);

// ─── Professor Style Analysis ───
// POST /api/questions/analyze-style
// Body: { courseId: ObjectId }
// Triggers AI analysis of historical exam questions to build a professor's style profile.
router.post('/analyze-style', questionsController.analyzeStyle);

// ─── Custom Exam Generation (SSE Stream) ───
// GET /api/questions/generate-stream
// Uses Server-Sent Events (SSE) for real-time delivery — must be GET since
// the browser's EventSource API only supports GET requests.
//
// Query parameters:
//   - courseId       (required) : MongoDB ObjectId of the target course
//   - materialFileIds (required): Comma-separated string of MaterialFile ObjectIds
//                                 (e.g., "id1,id2,id3") representing the lectures to cover
//   - examType       (optional) : 'Quiz' | 'Midterm' | 'Final' (defaults to 'Quiz')
//   - questionCount  (optional) : Number of questions to generate (defaults to 10)
//
// Example: /api/questions/generate-stream?courseId=abc&materialFileIds=id1,id2&examType=Midterm&questionCount=15
router.get('/generate-stream', questionsController.generateExamSSE);

// ─── Past Exams Archive ───
// GET /api/questions/archive
router.get('/archive', questionsController.getArchivedQuestions);

module.exports = router;
