/**
 * src/controllers/ai.controller.js
 * Handles schedule generation by extracting data from images.
 * Uses flexible filtering based on course numbers to solve prefix issues.
 */
const { extractScheduleFromImages } = require('../services/ai.service');
const { groupCourses, generateValidSchedules } = require('../utils/scheduleGenerator');

const generateScheduleFromFiles = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, message: 'No files uploaded.' });
        }

        // 1. Extract raw data and the model name used from the AI service
        const { extractedData, usedModel } = await extractScheduleFromImages(req.files);

        // 2. Define target course numbers dynamically from the request body (Frontend Integration)
        // We keep your initial array as a default fallback for Postman testing
        let targetNumbers = ['408', '427', '407', '490', '402', '428', '303'];

        // If the frontend sends target courses, parse and use them instead
        if (req.body && req.body.targetCourses) {
            try {
                // Assuming the frontend sends a stringified JSON array in form-data
                const parsedTargets = JSON.parse(req.body.targetCourses);
                
                // Extract only the digits, allowing the frontend to send "س402" or "402" safely
                targetNumbers = parsedTargets.map(course => {
                    const match = String(course).match(/\d+/);
                    return match ? match[0] : null;
                }).filter(Boolean);
            } catch (parseError) {
                console.warn("⚠️ Could not parse targetCourses from req.body. Using default test array.");
            }
        }

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