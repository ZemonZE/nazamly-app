// src/services/lectureProcessor.service.js
const LectureConcept = require('../models/lectureConcept.model');
const { downloadFileBuffer } = require('./drive.service');
const { extractLectureConcepts, analyzeProfessorStyle } = require('./ai.service');
const MaterialFile = require('../models/materials/materialFile.model');
const CourseInstance = require('../models/academic/courseInstance.model');
const ArchivedQuestion = require('../models/archivedQuestion.model');
const DoctorInsight = require('../models/ai/doctorInsight.model');

/**
 * processLectureBackground
 *
 * Asynchronous background worker that processes an uploaded PDF lecture file.
 * Pipeline:
 *   1. Download PDF from Google Drive
 *   2. Extract lecture concepts via Gemini AI
 *   3. Save LectureConcept to MongoDB
 *   4. Resolve the CourseInstance (course → doctor link)
 *   5. Pull all ArchivedQuestions for this course, run professor-style analysis
 *   6. Upsert DoctorInsight for the (doctorId, courseId) pair
 *   7. Mark MaterialFile aiStatus as SUCCESS
 *
 * Called in "fire-and-forget" fashion — the HTTP response is sent immediately.
 *
 * @param {ObjectId} materialFileId - MongoDB _id of the saved MaterialFile.
 * @param {String}   driveFileId   - Google Drive file ID for the PDF.
 * @param {ObjectId} courseId      - MongoDB _id of the Course this lecture belongs to.
 */
async function processLectureBackground(materialFileId, driveFileId, courseId) {
  console.log(`[LectureProcessor] Background job STARTED for materialFileId=${materialFileId}, driveFileId=${driveFileId}`);

  try {
    // ─── Mark as PROCESSING ───────────────────────────────────────────────────
    await MaterialFile.findByIdAndUpdate(materialFileId, { aiStatus: 'PROCESSING', aiError: null });

    // ─── Step 1: Download the PDF buffer from Google Drive ───────────────────
    console.log(`[LectureProcessor] Step 1: Downloading PDF from Drive (driveFileId=${driveFileId})...`);
    const pdfBuffer = await downloadFileBuffer(driveFileId);
    console.log(`[LectureProcessor] Step 1 DONE: Received ${pdfBuffer.length} bytes.`);

    // ─── Step 2: Extract lecture concepts via Gemini Multimodal ─────────────
    console.log(`[LectureProcessor] Step 2: Sending PDF to Gemini for concept extraction...`);
    const aiResult = await extractLectureConcepts(pdfBuffer);
    console.log(`[LectureProcessor] Step 2 DONE: Extracted ${aiResult.keywords?.length || 0} keywords.`);

    // ─── Step 3: Save extracted concepts to MongoDB ──────────────────────────
    console.log(`[LectureProcessor] Step 3: Saving concepts to MongoDB...`);
    await LectureConcept.create({
      materialFileId,
      keywords: [
        ...(aiResult.keywords || []),
        ...(aiResult.keyConcepts || []),
      ],
      extractedTextSummary: aiResult.extractedTextSummary || '',
    });

    // ─── Step 4: Resolve CourseInstance to find the doctor for this course ───
    // Only proceed with profiling if we were given a courseId.
    // If this lecture came from a course without a CourseInstance, we still
    // mark the lecture as SUCCESS (concept extraction is the primary job).
    let doctorId = null;
    let courseInstance = null;

    if (courseId) {
      // Find the most-recent CourseInstance for this course (latest semester)
      courseInstance = await CourseInstance.findOne({ courseId })
        .sort({ createdAt: -1 })
        .lean();

      if (courseInstance) {
        doctorId = courseInstance.doctorId;
        console.log(`[LectureProcessor] Step 4: Resolved doctorId=${doctorId} via CourseInstance=${courseInstance._id}`);
      } else {
        console.warn(`[LectureProcessor] Step 4: No CourseInstance found for courseId=${courseId}. Skipping profiling.`);
      }
    }

    // ─── Step 5: Run professor-style analysis if a doctor is linked ─────────
    if (doctorId && courseId) {
      console.log(`[LectureProcessor] Step 5: Fetching ArchivedQuestions for doctor/course profiling...`);

      // Gather all archived questions for this course to build the style profile
      const archivedQuestions = await ArchivedQuestion.find({ courseId }).lean();

      if (archivedQuestions.length >= 3) {
        // Minimum threshold: require at least 3 questions for a meaningful profile
        console.log(`[LectureProcessor] Step 5: Analyzing ${archivedQuestions.length} archived questions...`);
        const styleProfile = await analyzeProfessorStyle(archivedQuestions);

        // ─── Step 6: Upsert DoctorInsight for this (doctor, course) pair ──────
        console.log(`[LectureProcessor] Step 6: Upserting DoctorInsight for doctorId=${doctorId}, courseId=${courseId}...`);
        await DoctorInsight.findOneAndUpdate(
          { doctorId, courseId }, // filter — one doc per professor/course pair
          {
            $set: {
              courseInstanceId: courseInstance._id,
              doctorId,
              courseId,
              preferredQuestionTypes: styleProfile.preferredQuestionTypes || [],
              difficultyDistribution: styleProfile.difficultyDistribution || {},
              trickPhrases: styleProfile.trickPhrases || [],
              averageQuestionLength: styleProfile.averageQuestionLength || 'medium',
              summaryText: `Auto-generated from ${archivedQuestions.length} archived questions on ${new Date().toLocaleDateString()}.`,
              generatedAt: new Date(),
            },
          },
          { upsert: true, returnDocument: 'after' }
        );
        console.log(`[LectureProcessor] Step 6 DONE: DoctorInsight saved for doctorId=${doctorId}.`);
      } else {
        console.log(`[LectureProcessor] Step 5: Only ${archivedQuestions.length} archived questions — minimum threshold (3) not met. Skipping profiling.`);
      }
    }

    // ─── Mark as SUCCESS ──────────────────────────────────────────────────────
    await MaterialFile.findByIdAndUpdate(materialFileId, { aiStatus: 'SUCCESS', aiError: null });
    console.log(`[LectureProcessor] Background job COMPLETED SUCCESSFULLY for materialFileId=${materialFileId}`);

  } catch (error) {
    // Persist FAILED state with error details so the admin can see and retry
    await MaterialFile.findByIdAndUpdate(materialFileId, {
      aiStatus: 'FAILED',
      aiError: error.message || 'Unknown processing error',
    });
    console.error(`[LectureProcessor] Background job FAILED for materialFileId=${materialFileId}:`, error);
  }
}

module.exports = { processLectureBackground };
