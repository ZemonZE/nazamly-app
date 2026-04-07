// src/services/examGenerator.service.js
const LectureConcept = require('../models/lectureConcept.model');
const ProfessorProfile = require('../models/professorProfile.model');
const QuestionBank = require('../models/questionBank.model');
const { generateCustomExamWithRAG } = require('./ai.service');

/**
 * Default balanced professor profile used as a fallback when no
 * ProfessorProfile document exists for the given course.
 */
const DEFAULT_PROFESSOR_PROFILE = {
  preferredQuestionTypes: ['MCQ', 'True/False'],
  difficultyDistribution: { easy: 30, medium: 50, hard: 20 },
  trickPhrases: [],
  averageQuestionLength: 'medium',
};

/**
 * generateAndSaveCustomExam
 *
 * Orchestrates the full RAG-powered exam generation pipeline:
 * 1. Retrieves lecture concepts for the selected material files.
 * 2. Loads the professor's style profile (or uses a default).
 * 3. Calls Gemini AI with both context sources to generate questions.
 * 4. Saves all generated questions to the QuestionBank.
 *
 * @param {ObjectId} courseId - The MongoDB _id of the course.
 * @param {Array<ObjectId>} materialFileIdsArray - Array of MaterialFile _ids to pull concepts from.
 * @param {String} examType - Type of exam ('Quiz', 'Midterm', 'Final').
 * @param {Number} questionCount - Number of questions to generate.
 * @returns {Array} The array of saved QuestionBank documents.
 */
async function generateAndSaveCustomExam(courseId, materialFileIdsArray, examType, questionCount) {
  console.log(`[ExamGenerator] Starting custom ${examType} generation for courseId=${courseId}, ${materialFileIdsArray.length} lectures, ${questionCount} questions.`);

  try {
    // ─── Step 1: Fetch LectureConcept documents for the selected lectures ───
    const concepts = await LectureConcept.find({
      materialFileId: { $in: materialFileIdsArray },
    }).lean();

    if (!concepts || concepts.length === 0) {
      throw new Error('Lecture concepts not processed yet for selected materials');
    }

    console.log(`[ExamGenerator] Fetched ${concepts.length} LectureConcept documents.`);

    // ─── Step 2: Map concepts to a lightweight payload to reduce token usage ───
    // Only include summary and keywords (which already contain keyConcepts from the processor)
    const aggregatedConcepts = concepts.map((c) => ({
      summary: c.extractedTextSummary || '',
      keywords: c.keywords || [],
    }));

    // ─── Step 3: Fetch the ProfessorProfile for this course ───
    let professorProfile = await ProfessorProfile.findOne({ courseId }).lean();

    if (!professorProfile) {
      console.log('[ExamGenerator] No ProfessorProfile found — using default balanced profile.');
      professorProfile = DEFAULT_PROFESSOR_PROFILE;
    } else {
      console.log('[ExamGenerator] ProfessorProfile loaded successfully.');
      // Extract only the style-relevant fields to reduce token payload
      professorProfile = {
        preferredQuestionTypes: professorProfile.preferredQuestionTypes,
        difficultyDistribution: professorProfile.difficultyDistribution,
        trickPhrases: professorProfile.trickPhrases,
        averageQuestionLength: professorProfile.averageQuestionLength,
      };
    }

    // ─── Step 4: Call Gemini AI to generate the custom exam via RAG ───
    const generatedQuestions = await generateCustomExamWithRAG(
      aggregatedConcepts,
      professorProfile,
      examType,
      questionCount
    );

    // ─── Step 5: Prepare and bulk-save all questions to QuestionBank ───
    const questionsToSave = generatedQuestions.map((q) => ({
      courseId,
      materialFileId: materialFileIdsArray[0] || null, // Default to first lecture; ideally mapped via derivedFromConcept
      questionText: q.questionText,
      options: q.options || [],
      correctAnswer: q.correctAnswer || '',
      difficulty: q.difficulty || 3,
      aiConfidenceScore: q.aiConfidenceScore || null,
      source: 'ai_generated',
      status: 'ready',
    }));

    const savedQuestions = await QuestionBank.insertMany(questionsToSave);

    console.log(`[ExamGenerator] Successfully saved ${savedQuestions.length} AI-generated questions to QuestionBank.`);

    return savedQuestions;
  } catch (error) {
    console.error(`[ExamGenerator] Custom exam generation failed for courseId=${courseId}:`, error.message);
    throw error;
  }
}

module.exports = { generateAndSaveCustomExam };
