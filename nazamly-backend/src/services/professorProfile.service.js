// src/services/professorProfile.service.js
const QuestionBank = require('../models/questionBank.model');
const ProfessorProfile = require('../models/professorProfile.model');
const { analyzeProfessorStyle } = require('./ai.service');

/**
 * generateAndSaveProfile
 *
 * Fetches all historically extracted exam questions for a given course,
 * sends them to Gemini AI for style analysis, and saves the resulting
 * professor teaching/exam style profile to the database.
 *
 * @param {ObjectId} courseId - The MongoDB _id of the course to analyze.
 * @returns {Object} The saved or updated ProfessorProfile document.
 */
async function generateAndSaveProfile(courseId) {
  console.log(`[ProfessorProfile] Generating style profile for courseId=${courseId}...`);

  try {
    // ─── Step 1: Fetch all exam-extracted questions for this course ───
    const questions = await QuestionBank.find({
      courseId,
      source: 'extracted_from_exam',
    }).lean();

    if (!questions || questions.length === 0) {
      throw new Error('Not enough data to analyze style');
    }

    console.log(`[ProfessorProfile] Found ${questions.length} extracted exam questions for analysis.`);

    // ─── Step 2: Map questions to a lighter payload to save tokens ───
    // Only include the fields Gemini needs for style analysis
    const lightQuestions = questions.map((q) => ({
      questionText: q.questionText,
      options: q.options,
      correctAnswer: q.correctAnswer,
      difficulty: q.difficulty,
    }));

    // ─── Step 3: Call Gemini AI for professor style analysis ───
    const styleResult = await analyzeProfessorStyle(lightQuestions);

    // ─── Step 4: Upsert the ProfessorProfile (update if exists, create if not) ───
    const profileData = {
      preferredQuestionTypes: styleResult.preferredQuestionTypes || [],
      difficultyDistribution: styleResult.difficultyDistribution || {},
      trickPhrases: styleResult.trickPhrases || [],
      averageQuestionLength: styleResult.averageQuestionLength || 'medium',
      styleProfileDirty: false,
      lastAnalyzedAt: new Date(),
    };

    const profile = await ProfessorProfile.findOneAndUpdate(
      { courseId },
      { $set: profileData },
      { returnDocument: 'after', upsert: true }
    );

    console.log(`[ProfessorProfile] Style profile saved successfully for courseId=${courseId}.`);

    return profile;
  } catch (error) {
    console.error(`[ProfessorProfile] Failed to generate profile for courseId=${courseId}:`, error.message);
    throw error;
  }
}

module.exports = { generateAndSaveProfile };
