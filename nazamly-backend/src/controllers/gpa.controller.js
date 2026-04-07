// src/controllers/gpa.controller.js

const { 
    calculateTermGPA, 
    calculateExpectedCGPA, 
    calculateSmartTargetStrategy 
} = require('../utils/gpaCalculator');

// Core requirements for python integration
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');
const execAsync = util.promisify(exec);

// Importing Repositories instead of direct Models
const Course_Repo = require('../Repos/Course_Repo');
const User_Repo = require('../Repos/User_Repo'); 
const TranscriptUpload_Repo = require('../Repos/TranscriptUpload_Repo'); 

const calculateCurrentTerm = async (req, res) => {
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
        const termResult = calculateTermGPA(courses);

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

// ── Transcript Upload CRUD ──

const uploadTranscript = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No transcript file uploaded.' });
        }

        const student = await User_Repo.findByFirebaseUid(req.user.uid);
        if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

        // 1. Create a pending record via Repo
        let newTranscript = await TranscriptUpload_Repo.create({
            userId: student._id,
            fileName: req.file.originalname,
            fileType: req.file.mimetype,
            status: 'processing'
        });

        // 2. Prepare file temporary path for Python script
        const uploadsDir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        const tempFilePath = path.join(uploadsDir, `temp_${Date.now()}_${req.file.originalname}`);
        fs.writeFileSync(tempFilePath, req.file.buffer);

        // 3. Execute Python Script Asynchronously
        const pythonScriptPath = path.join(__dirname, '../services/extract_transcript.py');
        const command = `python "${pythonScriptPath}" "${tempFilePath}"`;

        try {
            const { stdout, stderr } = await execAsync(command);

            // Ensure to clean up the temp file
            if (fs.existsSync(tempFilePath)) {
                fs.unlinkSync(tempFilePath);
            }

            if (stderr && !stdout) {
                throw new Error(`Python stderr: ${stderr}`);
            }

            // Parse exactly what python spits out in stdout
            const result = JSON.parse(stdout);

            if (result.success) {
                // Update transcript via repo
                newTranscript = await TranscriptUpload_Repo.update(newTranscript._id, {
                    extractedCourses: result.courses,
                    termGPA: result.termGPA,
                    totalCreditHours: result.totalCreditHours,
                    ocrConfidence: result.ocrConfidence,
                    status: 'completed'
                });
            } else {
                newTranscript = await TranscriptUpload_Repo.update(newTranscript._id, {
                    status: 'failed',
                    errorMessage: result.error || 'Python script returned success: false'
                });
            }

        } catch (err) {
            console.error("Python Execution Error:", err);
            if (fs.existsSync(tempFilePath)) {
                fs.unlinkSync(tempFilePath);
            }
            
            newTranscript = await TranscriptUpload_Repo.update(newTranscript._id, {
                status: 'failed',
                errorMessage: 'Python OCR execution crashed or threw an error.'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Transcript processed internally',
            data: {
                transcriptId: newTranscript._id,
                status: newTranscript.status,
                extractedCourses: newTranscript.extractedCourses,
                termGPA: newTranscript.termGPA,
                totalCreditHours: newTranscript.totalCreditHours,
                ocrConfidence: newTranscript.ocrConfidence
            }
        });

    } catch (error) {
        console.error('Error in uploadTranscript:', error);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

const getAllTranscripts = async (req, res) => {
    try {
        const student = await User_Repo.findByFirebaseUid(req.user.uid);
        if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

        const transcripts = await TranscriptUpload_Repo.findByUserId(student._id);
        
        // Map to a cleaner response
        const data = transcripts.map(t => ({
            id: t._id,
            fileName: t.fileName,
            status: t.status,
            termGPA: t.termGPA,
            totalCreditHours: t.totalCreditHours,
            createdAt: t.createdAt
        }));

        return res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Error in getAllTranscripts:', error);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

const getTranscriptById = async (req, res) => {
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

const deleteTranscript = async (req, res) => {
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

module.exports = {
    calculateCurrentTerm,
    generateTargetPlan,
    getTermCourses,
    addTermCourse,
    removeTermCourse,
    uploadTranscript,
    getAllTranscripts,
    getTranscriptById,
    deleteTranscript
};