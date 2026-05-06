// src/controllers/Schedule.controller.js

const Schedule_Repo = require('../Repos/Schedule_Repo');
const Sessions_Repo = require('../Repos/Sessions_Repo');
const User_Repo = require('../Repos/User_Repo');
const { extractSchedule } = require('../services/ocr.service');

/**
 * Save Timetable (Unified Workflow for Web and Mobile)
 * POST /api/schedule/save-timetable
 */
const saveTimetable = async (req, res) => {
    try {
        const firebaseUid = req.user.uid;
        const { entries, title } = req.body;

        // 1. Find user in MongoDB
        const student = await User_Repo.findByFirebaseUid(firebaseUid);
        if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

        // 2. Create a new TimeTable document
        const newTimetable = await Schedule_Repo.create({
            userId: student._id, // Internal DB ID
            title: title || 'Unified Schedule',
            isActive: true
        });

        // 3. Save each session/entry and link to the TimeTable
        if (entries && Array.isArray(entries)) {
            const sessionsToCreate = entries.map(entry => ({
                ...entry,
                userId: student._id,
                timeTableId: newTimetable._id
            }));
            const createdSessions = await Sessions_Repo.createMany(sessionsToCreate);
            
            // Link these session IDs back to the TimeTable
            await Schedule_Repo.update(newTimetable._id, {
                entries: createdSessions.map(s => s._id)
            });
        }

        // 4. Update the User model to track this as their active timetable
        await User_Repo.update(student._id, { timeTableId: newTimetable._id });

        // 5. Fetch the updated student with populated fields if needed
        const updatedStudent = await User_Repo.findByFirebaseUid(firebaseUid);

        return res.status(201).json({
            success: true,
            message: 'Timetable saved successfully across all platforms.',
            data: { 
                timeTableId: newTimetable._id,
                user: updatedStudent
            }
        });

    } catch (error) {
        console.error('Error in saveTimetable:', error);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

/**
 * Fetch My Timetable (Deeply Populated)
 * GET /api/schedule/my-timetable
 */
const getMyTimetable = async (req, res) => {
    try {
        const firebaseUid = req.user.uid;
        
        // 1. Find user from MongoDB
        const student = await User_Repo.findByFirebaseUid(firebaseUid);
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found in database.' });
        }

        // 2. Check if the user has an active timeTableId assigned
        if (!student.timeTableId) {
            console.log(`[ScheduleController] No active timetable found for student: ${student._id}`);
            return res.status(200).json({
                success: true,
                message: 'No active timetable assigned to this user.',
                data: {
                    entries: [],
                    termCourses: student.termCourses || [],
                    timeTableId: null
                }
            });
        }

        // 3. Retrieve the specific timetable using the ID stored in User Profile
        // We use deep population to get all session details and course info
        const schedule = await Schedule_Repo.model.findById(student.timeTableId)
            .populate({
                path: 'entries',
                populate: { path: 'courseId' } // Deeply populate course details for each session
            });

        if (!schedule || schedule.isDeleted) {
            console.warn(`[ScheduleController] Timetable ID ${student.timeTableId} exists in user profile but document not found or deleted.`);
            return res.status(200).json({
                success: true,
                data: {
                    entries: [],
                    termCourses: student.termCourses || [],
                    timeTableId: null
                }
            });
        }

        // 4. Return the formatted data
        return res.status(200).json({
            success: true,
            data: {
                entries: schedule.entries || [],
                termCourses: student.termCourses || [],
                timeTableId: schedule._id,
                title: schedule.title
            }
        });

    } catch (error) {
        // Detailed error logging as requested for debugging
        console.error('CRITICAL ERROR in getMyTimetable:');
        console.error(error.stack); 
        
        return res.status(500).json({ 
            success: false, 
            message: 'Internal server error while fetching timetable.',
            error: error.message 
        });
    }
};

/**
 * Add or update a user's schedule manually (Legacy support)
 */
const addOrUpdateSchedule = async (req, res) => {
    // Re-use saveTimetable logic or keep as is.
    // For unification, we encourage using saveTimetable.
    return saveTimetable(req, res);
};

/**
 * Get the current active schedule
 */
const getMySchedule = async (req, res) => {
    return getMyTimetable(req, res);
};

/**
 * Delete a specific session
 */
const deleteSession = async (req, res) => {
    try {
        const { sessionId } = req.params;
        await Sessions_Repo.delete(sessionId);
        return res.status(200).json({ success: true, message: 'Session deleted.' });
    } catch (error) {
        console.error('Error in deleteSession:', error);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

/**
 * Save AI-generated schedule
 */
const saveAISchedule = async (req, res) => {
    return saveTimetable(req, res);
};

/**
 * Add a single entry to the timetable
 */
const addTimeTableEntry = async (req, res) => {
    try {
        const firebaseUid = req.user.uid;
        const entryData = req.body;

        let schedule = await Schedule_Repo.findActiveByUserId(firebaseUid);
        if (!schedule) {
            schedule = await Schedule_Repo.create({ userId: firebaseUid, title: 'My Schedule', isActive: true });
        }

        const session = await Sessions_Repo.create({
            ...entryData,
            userId: firebaseUid,
            timeTableId: schedule._id
        });

        await Schedule_Repo.addEntry(schedule._id, session._id);

        return res.status(201).json({ success: true, data: session });
    } catch (error) {
        console.error('Error in addTimeTableEntry:', error);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

/**
 * Get timetable
 */
const getTimeTable = async (req, res) => {
    return getMyTimetable(req, res);
};

/**
 * Import schedule from image using OCR
 */
const importScheduleFromImage = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

        const ocrResult = await extractSchedule(req.file.path);
        
        return res.status(200).json({ 
            success: true, 
            data: ocrResult.classes,
            confidence: ocrResult.confidence
        });
    } catch (error) {
        console.error('Error in importScheduleFromImage:', error);
        return res.status(500).json({ success: false, message: 'OCR extraction failed.' });
    }
};

module.exports = {
    saveTimetable,
    getMyTimetable,
    addOrUpdateSchedule,
    getMySchedule,
    deleteSession,
    saveAISchedule,
    addTimeTableEntry,
    getTimeTable,
    importScheduleFromImage
};
