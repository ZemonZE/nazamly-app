/**
 * src/controllers/ai.controller.js
 * Handles schedule generation by extracting data from images.
 * Uses flexible filtering based on course numbers to solve prefix issues.
 */
const { extractScheduleFromImages } = require('../services/ai.service');
const { groupCourses, generateValidSchedules } = require('../utils/scheduleGenerator');
const userRepo = require('../Repos/User_Repo');

const generateScheduleFromFiles = async (req, res) => {
  console.log("[ai.controller] generateScheduleFromFiles called");
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, message: 'No files uploaded.' });
        }

        // 1. Extract raw data and the model name used from the AI service
        const { extractedData, usedModel } = await extractScheduleFromImages(req.files);

        // 2. Extract Valid Courses from User Database
        if (!req.user || !req.user.uid) {
            return res.status(401).json({ success: false, message: 'Unauthorized. Please login to generate schedules.' });
        }

        const user = await userRepo.findByFirebaseUid(req.user.uid);

        if (!user || !user.termCourses || user.termCourses.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Please register for courses before generating an AI schedule.' 
            });
        }

        // 3. Map target course numbers from user's registered courses
        const targetNumbers = user.termCourses.map(course => {
            const match = String(course.courseCode).match(/\d+/);
            return match ? match[0] : null;
        }).filter(Boolean);

        // 3. Flexible Filtering Layer
        const filteredData = extractedData.filter(session => {
            if (!session.courseCode) return false;
            const match = session.courseCode.match(/\d+/);
            const extractedNumber = match ? match[0] : null;
            return extractedNumber && targetNumbers.includes(extractedNumber);
        });

        const coursesFound = [...new Set(filteredData.map(s => s.courseCode))];

        if (filteredData.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'None of your target courses were detected in the images.',
                metadata: { aiModelUsed: usedModel }
            });
        }

        // 4. Generate schedules
        const groupedCourses = groupCourses(filteredData);
        const topSchedules = generateValidSchedules(groupedCourses);

        // 5. Final Response
        return res.status(200).json({
            success: true,
            message: 'Smart schedules generated successfully.',
            metadata: {
                aiModelUsed: usedModel,
                totalSessionsExtracted: extractedData.length,
                filteredSessionsCount: filteredData.length,
                uniqueCoursesIdentified: coursesFound,
                totalSchedulesFound: topSchedules.length
            },
            rawAiOutput: extractedData, 
            generatedSchedules: topSchedules 
        });

    } catch (error) {
        console.error('❌ Controller Error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { generateScheduleFromFiles };