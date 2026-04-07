// src/controllers/questions.controller.js
const { generateAndSaveProfile } = require('../services/professorProfile.service');
const { generateAndSaveCustomExam } = require('../services/examGenerator.service');

/**
 * POST /api/questions/analyze-style/:courseId
 * Triggers professor style analysis for a given course.
 * Fetches historical exam questions, sends them to Gemini AI,
 * and saves the resulting style profile to the database.
 */
exports.analyzeStyle = async (req, res) => {
  try {
    const courseId = req.params.courseId || req.body.courseId;

    if (!courseId) {
      return res.status(400).json({ error: 'courseId is required' });
    }

    const profile = await generateAndSaveProfile(courseId);

    res.status(200).json({
      message: 'Professor style profile generated successfully',
      profile,
    });
  } catch (error) {
    console.error('Error analyzing professor style:', error.message);

    // Return a more specific status code if there is not enough data
    if (error.message === 'Not enough data to analyze style') {
      return res.status(422).json({ error: error.message });
    }

    res.status(500).json({ error: 'Failed to analyze professor style', details: error.message });
  }
};

/**
 * GET /api/questions/generate-stream
 * Server-Sent Events (SSE) endpoint for real-time custom exam generation.
 * Streams progress updates to the client while the AI generates questions.
 * Must be GET because the browser's EventSource API only supports GET requests.
 *
 * Query params:
 *   - courseId:        ObjectId of the course
 *   - materialFileIds: Comma-separated string of MaterialFile ObjectIds (e.g., "id1,id2,id3")
 *   - examType:        'Quiz' | 'Midterm' | 'Final' (defaults to 'Quiz')
 *   - questionCount:   Number of questions to generate (defaults to 10)
 */
exports.generateExamSSE = async (req, res) => {
  // ─── SSE Headers ───
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    // Parse all parameters from query string (GET-only for EventSource compatibility)
    const { courseId, examType = 'Quiz' } = req.query;
    const questionCount = parseInt(req.query.questionCount, 10) || 10;

    // materialFileIds arrives as a comma-separated string from the query string
    // e.g., "64a1b2c3d4e5f6,64a1b2c3d4e5f7" -> ["64a1b2c3d4e5f6", "64a1b2c3d4e5f7"]
    const materialFileIds = req.query.materialFileIds
      ? req.query.materialFileIds.split(',').map(id => id.trim()).filter(Boolean)
      : [];

    if (!courseId || materialFileIds.length === 0) {
      res.write(`data: ${JSON.stringify({ status: 'error', message: 'courseId and materialFileIds (comma-separated) are required' })}\n\n`);
      return res.end();
    }

    // Send initial progress event to the client
    res.write(`data: ${JSON.stringify({ status: 'generating', message: 'Analyzing professor style and building your custom exam...' })}\n\n`);

    // Generate the exam asynchronously
    const questions = await generateAndSaveCustomExam(courseId, materialFileIds, examType, questionCount);

    // Send the completed exam to the client
    res.write(`data: ${JSON.stringify({ status: 'ready', questions })}\n\n`);
    res.end();
  } catch (error) {
    console.error('Error in SSE exam generation:', error.message);

    // Send error event to the client and close the connection
    res.write(`data: ${JSON.stringify({ status: 'error', message: error.message })}\n\n`);
    res.end();
  }
};


