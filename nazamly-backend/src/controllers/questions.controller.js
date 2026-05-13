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
  console.log("[questions.controller] analyzeStyle called");
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
  console.log("[questions.controller] generateExamSSE called");
  // ─── SSE Headers ───
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    // Parse all parameters from query string (GET-only for EventSource compatibility)
    const { courseId, examType = 'Quiz' } = req.query;
    const questionCount = parseInt(req.query.questionCount, 10) || 10;

    // Question type distribution from frontend
    const questionDistribution = {
      mcq: parseInt(req.query.mcq, 10) || 0,
      tf: parseInt(req.query.tf, 10) || 0,
      essay: parseInt(req.query.essay, 10) || 0,
    };

    // materialFileIds arrives as a comma-separated string from the query string
    // e.g., "64a1b2c3d4e5f6,64a1b2c3d4e5f7" -> ["64a1b2c3d4e5f6", "64a1b2c3d4e5f7"]
    const materialFileIds = req.query.materialFileIds
      ? req.query.materialFileIds.split(',').map(id => id.trim()).filter(Boolean)
      : [];

    if (!courseId || materialFileIds.length === 0) {
      res.write(`data: ${JSON.stringify({ success: false, message: 'courseId and materialFileIds (comma-separated) are required' })}\n\n`);
      return res.end();
    }

    const MaterialFile = require('../models/materials/materialFile.model');
    const mongoose = require('mongoose');

    // Map Google Drive IDs from UI to standard MongoDB Object IDs via MaterialFile
    const resolvedMaterials = await MaterialFile.find({ driveFileId: { $in: materialFileIds } }).lean();
    const resolvedIds = resolvedMaterials.map(m => m._id.toString());

    if (!mongoose.Types.ObjectId.isValid(courseId) || resolvedIds.length === 0) {
      res.write(`data: ${JSON.stringify({ success: false, message: 'No processed lecture concepts found for this selection' })}\n\n`);
      return res.end();
    }

    // Send initial progress event to the client
    res.write(`data: ${JSON.stringify({ status: 'generating', message: 'Analyzing professor style and building your custom exam...' })}\n\n`);

    const ProfessorProfile = require('../models/professorProfile.model');
    const { generateAndSaveProfile } = require('../services/professorProfile.service');

    let profile = await ProfessorProfile.findOne({ courseId }).lean();
    if (profile && profile.styleProfileDirty === true) {
      res.write(`data: ${JSON.stringify({ status: 'generating', message: 'Prioritizing analysis of recent professor exams...' })}\n\n`);
      try {
        await generateAndSaveProfile(courseId);
      } catch (e) {
        console.warn('Failed to update dirty profile', e.message);
      }
    }

    // Generate the exam asynchronously using the resolved Object IDs
    const questions = await generateAndSaveCustomExam(courseId, resolvedIds, examType, questionCount, questionDistribution);

    // Send the completed exam to the client
    res.write(`data: ${JSON.stringify({ status: 'ready', questions })}\n\n`);
    res.end();
  } catch (error) {
    console.error('Error in SSE exam generation:', error.message);

    // Send error event to the client safely formatted
    res.write(`data: ${JSON.stringify({ success: false, message: error.message })}\n\n`);
    res.end();
  }
};

/**
 * GET /api/questions/archive
 * Retrieves past exam questions stored in the archive linked to specific lectures.
 * Expected query parameters: courseId, lectureId (comma-separated string of Google Drive IDs)
 */
exports.getArchivedQuestions = async (req, res) => {
  console.log("[questions.controller] getArchivedQuestions called");
  try {
    const { courseId, lectureId } = req.query;

    const lectureIdsArray = lectureId ? lectureId.split(',').map(id => id.trim()).filter(Boolean) : [];
    
    if (!courseId) {
      return res.status(400).json({ error: 'courseId is required.' });
    }

    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ error: 'Invalid courseId format.' });
    }

    let materialFileIds = [];
    if (lectureIdsArray.length > 0) {
      const MaterialFile = require('../models/materials/materialFile.model');
      const resolvedMaterials = await MaterialFile.find({ driveFileId: { $in: lectureIdsArray } }).lean();
      materialFileIds = resolvedMaterials.map(m => m._id);
    }

    const ArchivedQuestion = require('../models/archivedQuestion.model');
    const query = { courseId };

    if (materialFileIds.length > 0) {
      // Use $in operator to fetch questions linked to ANY of the selected mapped MongoDB ObjectIds
      query.linkedLectureId = { $in: materialFileIds };
    } else if (lectureIdsArray.length > 0) {
      // If Drive IDs were provided but NONE resolved to MongoDB MaterialFiles, there are no matches.
      return res.json({ midterms: [], finals: [] });
    }

    const archivedQuestions = await ArchivedQuestion.find(query).lean();

    // Organize natively into clean categories matching Vanilla CSS UI expectations
    const midterms = archivedQuestions.filter(q => q.examType === 'midterm');
    const finals = archivedQuestions.filter(q => q.examType === 'final');

    res.json({ midterms, finals });

  } catch (error) {
    console.error('Error fetching archived questions:', error.message);
    res.status(500).json({ error: 'Failed to retrieve archive' });
  }
};


