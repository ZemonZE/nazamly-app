// src/services/lectureProcessor.service.js
const LectureConcept = require('../models/lectureConcept.model');
const { downloadFileBuffer } = require('./drive.service');
const { extractLectureConcepts } = require('./ai.service');

/**
 * processLectureBackground
 *
 * Asynchronous background worker that processes an uploaded PDF lecture file
 * for AI-driven concept extraction. This function is designed to be called
 * in a "fire-and-forget" manner (without await) so that the HTTP response
 * is returned to the admin immediately without blocking.
 *
 * Pipeline: Google Drive (download) -> Gemini Multimodal (extract) -> MongoDB (save)
 *
 * @param {ObjectId} materialFileId - The MongoDB _id of the saved MaterialFile document.
 * @param {String} driveFileId - The Google Drive file ID used to fetch the file buffer.
 */
async function processLectureBackground(materialFileId, driveFileId) {
  console.log(`[LectureProcessor] Background job STARTED for materialFileId=${materialFileId}, driveFileId=${driveFileId}`);

  try {
    // ─── Step 1: Fetch the PDF buffer from Google Drive ───
    console.log(`[LectureProcessor] Step 1: Downloading file buffer from Google Drive (driveFileId=${driveFileId})...`);
    const pdfBuffer = await downloadFileBuffer(driveFileId);
    console.log(`[LectureProcessor] Step 1 DONE: Received buffer of ${pdfBuffer.length} bytes.`);

    // ─── Step 2: Send the PDF directly to Gemini AI for concept extraction ───
    // No OCR needed — Gemini's multimodal API handles PDF parsing natively.
    console.log(`[LectureProcessor] Step 2: Sending PDF buffer to Gemini AI for concept extraction...`);
    const aiResult = await extractLectureConcepts(pdfBuffer);
    console.log(`[LectureProcessor] Step 2 DONE: Extracted ${aiResult.keywords?.length || 0} keywords and ${aiResult.keyConcepts?.length || 0} concepts.`);

    // ─── Step 3: Save the extracted concepts to the LectureConcept model ───
    console.log(`[LectureProcessor] Step 3: Saving extracted concepts to MongoDB...`);
    await LectureConcept.create({
      materialFileId,
      keywords: [
        ...(aiResult.keywords || []),
        ...(aiResult.keyConcepts || []),
      ],
      extractedTextSummary: aiResult.extractedTextSummary || '',
    });

    console.log(`[LectureProcessor] Background job COMPLETED SUCCESSFULLY for materialFileId=${materialFileId}`);
  } catch (error) {
    // Log the failure but do not throw — this is a background job and there is
    // no HTTP response to send an error to. A retry mechanism can be added later.
    console.error(`[LectureProcessor] Background job FAILED for materialFileId=${materialFileId}:`, error);
  }
}

module.exports = { processLectureBackground };
