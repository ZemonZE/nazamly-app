// src/services/examProcessor.service.js
const { downloadFileBuffer } = require('./drive.service');
const { extractQuestionsFromExam } = require('./ai.service');
const QuestionBank = require('../models/questionBank.model');

/**
 * processExamBackground
 *
 * Asynchronous background worker that processes an uploaded exam PDF
 * (midterm/final/assignment) for AI-driven question extraction.
 * Designed to be called in a "fire-and-forget" manner (without await)
 * so the HTTP response is sent to the admin immediately.
 *
 * Pipeline: Google Drive (download) -> Gemini Multimodal (extract questions) -> MongoDB (save to QuestionBank)
 *
 * @param {ObjectId} materialFileId - The MongoDB _id of the saved MaterialFile document.
 * @param {String} driveFileId - The Google Drive file ID used to fetch the file buffer.
 * @param {ObjectId} courseId - The MongoDB _id of the Course this exam belongs to.
 */
async function processExamBackground(materialFileId, driveFileId, courseId) {
  console.log(`[ExamProcessor] Background job STARTED for materialFileId=${materialFileId}, driveFileId=${driveFileId}, courseId=${courseId}`);

  try {
    // ─── Step 1: Download the exam PDF buffer from Google Drive ───
    console.log(`[ExamProcessor] Step 1: Downloading exam PDF from Google Drive (driveFileId=${driveFileId})...`);
    const pdfBuffer = await downloadFileBuffer(driveFileId);
    console.log(`[ExamProcessor] Step 1 DONE: Received buffer of ${pdfBuffer.length} bytes.`);

    // ─── Step 2: Extract questions from the exam PDF via Gemini AI ───
    console.log(`[ExamProcessor] Step 2: Sending exam PDF to Gemini AI for question extraction...`);
    const questions = await extractQuestionsFromExam(pdfBuffer);
    console.log(`[ExamProcessor] Step 2 DONE: Gemini extracted ${questions.length} questions.`);

    // ─── Step 3: Save each extracted question to the QuestionBank model ───
    console.log(`[ExamProcessor] Step 3: Saving ${questions.length} questions to QuestionBank...`);
    let savedCount = 0;

    for (const q of questions) {
      try {
        await QuestionBank.create({
          materialFileId,
          courseId,
          questionText: q.questionText,
          options: q.options || [],
          correctAnswer: q.correctAnswer || '',
          difficulty: q.difficulty || 3,
          source: 'extracted_from_exam',
          status: 'ready',
        });
        savedCount++;
      } catch (saveErr) {
        // Log individual question save errors but continue processing remaining questions
        console.warn(`[ExamProcessor] Failed to save question "${q.questionText?.substring(0, 50)}...":`, saveErr.message);
      }
    }

    console.log(`[ExamProcessor] Step 3 DONE: Successfully saved ${savedCount}/${questions.length} questions.`);
    console.log(`[ExamProcessor] Background job COMPLETED SUCCESSFULLY for materialFileId=${materialFileId}`);
  } catch (error) {
    // Log the failure but do not throw — this is a background job and there is
    // no HTTP response to send an error to. A retry mechanism can be added later.
    console.error(`[ExamProcessor] Background job FAILED for materialFileId=${materialFileId}:`, error);
  }
}

module.exports = { processExamBackground };
