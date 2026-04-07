// src/routes/questions.routes.js
const express = require('express');
const router = express.Router();
const questionsController = require('../controllers/questions.controller');

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

module.exports = router;
