// src/controllers/gpa.controller.js

const fs = require('fs');

const {
    calculateTermGPA: calculateTermGPAFromCalc,
    calculateExpectedCGPA,
    calculateSmartTargetStrategy
} = require('../utils/gpaCalculator');

const { enrichCourses, calculateTermGPA, calculateGPA, needsReview } = require('../utils/courseMapper');
const { extractTranscriptFromFile } = require('../services/ai.service');

// Importing Repositories (Repository Pattern — never access Models directly)
const Course_Repo = require('../Repos/Course_Repo');
const User_Repo = require('../Repos/User_Repo');
const TranscriptUpload_Repo = require('../Repos/TranscriptUpload_Repo');

// ── GPA Calculation ──

const calculateCurrentTerm = async (req, res) => {
  console.log("[gpa.controller] calculateCurrentTerm called");
    try {
        const { courses } = req.body;

        // Extract the Firebase UID from the authenticated request
        const firebaseUid = req.user.uid;

        // Fetch the user's historical GPA data using the Firebase UID via Repo
        const student = await User_Repo.findByFirebaseUid(firebaseUid);
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found.' });
        }

        const oldCGPA = student.cgpa || 0;
        const oldHours = student.completedHours || 0;

        // Calculate Term GPA
        const termResult = calculateTermGPAFromCalc(courses);

        // Calculate the new Cumulative GPA
        const newCGPA = calculateExpectedCGPA(oldCGPA, oldHours, termResult.termGPA, termResult.divisorTermHours);

        return res.status(200).json({
            success: true,
            message: 'GPA calculated successfully.',
            data: {
                termGPA: termResult.termGPA,
                termHoursCalculated: termResult.divisorTermHours,
                oldCGPA: oldCGPA,
                newCGPA: newCGPA
            }
        });

    } catch (error) {
        console.error('Error in calculateCurrentTerm:', error);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

const generateTargetPlan = async (req, res) => {
  console.log("[gpa.controller] generateTargetPlan called");
    try {
        const { targetCGPA, courses } = req.body;

        // Extract the Firebase UID from the authenticated request
        const firebaseUid = req.user.uid;

        // Fetch the user's profile using the Firebase UID via Repo
        const student = await User_Repo.findByFirebaseUid(firebaseUid);
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found.' });
        }

        const oldCGPA = student.cgpa || 0;
        const oldHours = student.completedHours || 0;

        // Enrich the requested courses with the real 'difficulty' from the database
        const enrichedCourses = await Promise.all(courses.map(async (coursePayload) => {
            const courseInDb = await Course_Repo.findByCode(coursePayload.courseCode);

            return {
                courseCode: coursePayload.courseCode,
                creditHours: coursePayload.creditHours,
                // Use DB difficulty if found, else fallback to 3 (Medium)
                difficulty: courseInDb && courseInDb.difficulty ? courseInDb.difficulty : 3
            };
        }));

        // Execute Algorithm
        const strategyResult = calculateSmartTargetStrategy(
            targetCGPA,
            oldCGPA,
            oldHours,
            enrichedCourses
        );

        if (!strategyResult.isPossible) {
            return res.status(400).json({
                success: false,
                message: strategyResult.message
            });
        }

        return res.status(200).json({
            success: true,
            message: strategyResult.message,
            data: {
                targetCGPA: strategyResult.targetCGPA,
                requiredTermAverageGPA: strategyResult.requiredTermAverageGPA,
                plan: strategyResult.plan
            }
        });

    } catch (error) {
        console.error('Error in generateTargetPlan:', error);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

// ── Term Courses CRUD ──

const getTermCourses = async (req, res) => {
  console.log("[gpa.controller] getTermCourses called");
    try {
        const student = await User_Repo.findByFirebaseUid(req.user.uid);
        if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });
        return res.json({ success: true, data: student.termCourses || [] });
    } catch (error) {
        console.error('Error in getTermCourses:', error);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

const addTermCourse = async (req, res) => {
  console.log("[gpa.controller] addTermCourse called");
    try {
        const { name, courseCode, creditHours } = req.body;
        if (!name || !courseCode || !creditHours) {
            return res.status(400).json({ success: false, message: 'name, courseCode and creditHours are required.' });
        }
        const student = await User_Repo.findByFirebaseUid(req.user.uid);
        if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

        student.termCourses.push({ name, courseCode, creditHours: Number(creditHours) });
        await User_Repo.update(student._id, { termCourses: student.termCourses });

        return res.status(201).json({ success: true, data: student.termCourses });
    } catch (error) {
        console.error('Error in addTermCourse:', error);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

const removeTermCourse = async (req, res) => {
  console.log("[gpa.controller] removeTermCourse called");
    try {
        const { courseId } = req.params;
        const student = await User_Repo.findByFirebaseUid(req.user.uid);
        if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

        student.termCourses = student.termCourses.filter(c => c._id.toString() !== courseId);
        await User_Repo.update(student._id, { termCourses: student.termCourses });

        return res.json({ success: true, data: student.termCourses });
    } catch (error) {
        console.error('Error in removeTermCourse:', error);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

// ── Transcript Upload & Extraction ──

/**
 * POST /api/gpa/upload-transcript
 *
 * Flow:
 * 1. Receive file via multer (diskStorage — saved to uploads/transcripts/)
 * 2. Create a "processing" record in MongoDB
 * 3. Send file to Gemini AI for extraction
 * 4. Enrich courses with credit hours from Course DB
 * 5. Calculate GPA
 * 6. Update record with results
 * 7. Delete temp file from disk
 * 8. Return enriched results to client
 */
const uploadTranscript = async (req, res) => {
  console.log("[gpa.controller] uploadTranscript called");
    let newTranscript = null;
    const filePath = req.file ? req.file.path : null;

    try {
        if (!req.file) {
            console.error('❌ Upload Failed: req.file is undefined! Check if Multer parsed the FormData.');
            console.error('Request Body keys received:', Object.keys(req.body));
            return res.status(400).json({ success: false, message: 'No transcript file uploaded. Check field name and boundary.' });
        }

        const student = await User_Repo.findByFirebaseUid(req.user.uid);
        if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

        const fileType = req.file.mimetype === 'application/pdf' ? 'pdf' : 'image';

        // 1. Create a pending record via Repo
        newTranscript = await TranscriptUpload_Repo.create({
            userId: student._id,
            fileName: req.file.originalname,
            fileType,
            status: 'processing'
        });

        // 2. Send file to Gemini AI for transcript extraction
        const ocrResult = await extractTranscriptFromFile(filePath);

        // 3. Check if extraction succeeded
        if (!ocrResult.courses || ocrResult.courses.length === 0) {
            const reviewNeeded = needsReview(ocrResult.confidence);

            newTranscript = await TranscriptUpload_Repo.update(newTranscript._id, {
                status: ocrResult.warning ? 'failed' : 'completed',
                errorMessage: ocrResult.error || ocrResult.warning || null,
                ocrSource: ocrResult.source || null,
                ocrConfidence: ocrResult.confidence || 0,
                requiresReview: true,
                semester: ocrResult.semester || null,
                extractedCourses: [],
                termGPA: null,
                totalCreditHours: 0
            });

            return res.status(200).json({
                success: false,
                message: ocrResult.error || ocrResult.warning || 'No courses extracted from transcript',
                data: {
                    transcriptId: newTranscript._id,
                    status: newTranscript.status,
                    extractedCourses: [],
                    termGPA: null,
                    totalCreditHours: 0,
                    ocrConfidence: ocrResult.confidence || 0,
                    requiresReview: true
                }
            });
        }

        // 4. Enrich courses with credit hours from Course DB
        const enrichedCourses = await enrichCourses(ocrResult.courses || []);

        // 5. Calculate GPA from enriched courses
        const { termGPA, totalCreditHours } = calculateTermGPA(enrichedCourses);
        const reviewRequired = needsReview(ocrResult.confidence);

        // 6. Update transcript record with successful results
        newTranscript = await TranscriptUpload_Repo.update(newTranscript._id, {
            extractedCourses: enrichedCourses,
            termGPA,
            totalCreditHours,
            ocrConfidence: ocrResult.confidence || 0,
            ocrSource: ocrResult.source || null,
            semester: ocrResult.semester || null,
            studentId: ocrResult.student_id || null,
            requiresReview: reviewRequired,
            status: 'completed'
        });

        // 7. Return successful result
        return res.status(200).json({
            success: true,
            message: 'Transcript processed successfully.',
            data: {
                transcriptId: newTranscript._id,
                status: 'completed',
                extractedCourses: enrichedCourses,
                termGPA,
                totalCreditHours,
                ocrConfidence: ocrResult.confidence || 0,
                ocrSource: ocrResult.source || null,
                semester: ocrResult.semester || null,
                requiresReview: reviewRequired
            }
        });

    } catch (error) {
        console.error('Error in uploadTranscript:', error);

        // Update the record to 'failed' if it was created
        if (newTranscript && newTranscript._id) {
            try {
                await TranscriptUpload_Repo.update(newTranscript._id, {
                    status: 'failed',
                    errorMessage: error.message || 'Unknown error during transcript processing'
                });
            } catch (updateErr) {
                console.error('Failed to update transcript status:', updateErr);
            }
        }

        return res.status(500).json({
            success: false,
            message: 'Transcript extraction failed.',
            error: error.message,
            transcriptId: newTranscript ? newTranscript._id : null
        });
    } finally {
        // Clean up temp file ALWAYS
        _deleteFile(filePath);
    }
};

// ── Transcript History ──

const getAllTranscripts = async (req, res) => {
  console.log("[gpa.controller] getAllTranscripts called");
    try {
        const student = await User_Repo.findByFirebaseUid(req.user.uid);
        if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

        const transcripts = await TranscriptUpload_Repo.findByUserId(student._id);

        // Map to a cleaner response (exclude heavy extractedCourses in list view)
        const data = transcripts.map(t => ({
            id: t._id.toString(),
            fileName: t.fileName,
            fileType: t.fileType,
            status: t.status,
            termGPA: t.termGPA,
            totalCreditHours: t.totalCreditHours,
            ocrConfidence: t.ocrConfidence,
            ocrSource: t.ocrSource,
            semester: t.semester,
            requiresReview: t.requiresReview,
            errorMessage: t.errorMessage,
            createdAt: t.createdAt
        }));

        return res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Error in getAllTranscripts:', error);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

const getTranscriptById = async (req, res) => {
  console.log("[gpa.controller] getTranscriptById called");
    try {
        const { id } = req.params;
        const student = await User_Repo.findByFirebaseUid(req.user.uid);
        if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

        const transcript = await TranscriptUpload_Repo.findUserTranscriptById(id, student._id);
        if (!transcript) return res.status(404).json({ success: false, message: 'Transcript not found.' });

        return res.status(200).json({
            success: true,
            data: transcript
        });
    } catch (error) {
        console.error('Error in getTranscriptById:', error);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

/**
 * PATCH /api/gpa/transcripts/:id — manual correction
 *
 * Accepts an array of course corrections and recalculates GPA.
 * Body: { courses: [{ courseCode, mark?, gradePoints?, creditHours? }] }
 */
const updateTranscript = async (req, res) => {
  console.log("[gpa.controller] updateTranscript called");
    try {
        const { id } = req.params;
        const { courses: corrections } = req.body;

        const student = await User_Repo.findByFirebaseUid(req.user.uid);
        if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

        const transcript = await TranscriptUpload_Repo.findUserTranscriptById(id, student._id);
        if (!transcript) return res.status(404).json({ success: false, message: 'Transcript not found.' });

        // Apply corrections
        const correctionMap = {};
        for (const c of (corrections || [])) correctionMap[c.courseCode] = c;

        const updatedCourses = transcript.extractedCourses.map(course => {
            const correction = correctionMap[course.courseCode];
            if (!correction) return course;
            return {
                ...course.toObject ? course.toObject() : course,
                mark:             correction.mark        ?? course.mark,
                gradePoints:      correction.gradePoints ?? course.gradePoints,
                creditHours:      correction.creditHours ?? course.creditHours,
                isManuallyEdited: true,
            };
        });

        // Recalculate GPA
        const { termGPA, totalCreditHours } = calculateTermGPA(updatedCourses);

        await TranscriptUpload_Repo.update(transcript._id, {
            extractedCourses: updatedCourses,
            termGPA,
            totalCreditHours
        });

        return res.status(200).json({
            success: true,
            termGPA,
            totalCreditHours,
            courses: updatedCourses,
        });
    } catch (error) {
        console.error('Error in updateTranscript:', error);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

const deleteTranscript = async (req, res) => {
  console.log("[gpa.controller] deleteTranscript called");
    try {
        const { id } = req.params;

        const student = await User_Repo.findByFirebaseUid(req.user.uid);
        if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

        const transcript = await TranscriptUpload_Repo.deleteUserTranscript(id, student._id);

        if (!transcript) return res.status(404).json({ success: false, message: 'Transcript not found or already deleted.' });

        return res.status(200).json({ success: true, message: 'Transcript deleted successfully.' });
    } catch (error) {
        console.error('Error in deleteTranscript:', error);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

/**
 * GET /api/gpa/history — GPA trend over time
 *
 * Returns completed transcripts with term GPA and a running cumulative GPA.
 */
const getGPAHistory = async (req, res) => {
  console.log("[gpa.controller] getGPAHistory called");
    try {
        const { limit = 20 } = req.query;
        const student = await User_Repo.findByFirebaseUid(req.user.uid);
        if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

        const history = await TranscriptUpload_Repo.getCompletedByUserId(student._id, limit);

        // Running average (simple cumulative GPA across semesters)
        const totalPts = history.reduce((s, t) => s + (t.termGPA || 0) * (t.totalCreditHours || 0), 0);
        const totalHrs = history.reduce((s, t) => s + (t.totalCreditHours || 0), 0);
        const cumulativeGPA = totalHrs > 0 ? parseFloat((totalPts / totalHrs).toFixed(2)) : 0;

        return res.status(200).json({
            success: true,
            data: { history, cumulativeGPA }
        });
    } catch (error) {
        console.error('Error in getGPAHistory:', error);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

// ── Internal helper ──────────────────────────────────────────────────────────
function _deleteFile(filePath) {
    if (!filePath) return;
    if (process.env.DELETE_AFTER_PROCESSING === 'false') return;
    try { fs.unlinkSync(filePath); } catch (_) { /* silently ignore */ }
}

module.exports = {
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
};