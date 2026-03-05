// src/controllers/gpa.controller.js

const { 
    calculateTermGPA, 
    calculateExpectedCGPA, 
    calculateSmartTargetStrategy 
} = require('../utils/gpaCalculator');

// Importing actual database models
const Course = require('../models/academic/course.model');
const User = require('../models/user/user.model'); 

const calculateCurrentTerm = async (req, res) => {
    try {
        const { courses } = req.body;
        
        // Extract the Firebase UID from the authenticated request
        const firebaseUid = req.user.uid; 

        // Fetch the user's historical GPA data using the Firebase UID
        const student = await User.findOne({ firebaseUid: firebaseUid });
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

        // Fetch the user's profile using the Firebase UID
        const student = await User.findOne({ firebaseUid: firebaseUid });
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found.' });
        }

        const oldCGPA = student.cgpa || 0;
        const oldHours = student.completedHours || 0;

        // Enrich the requested courses with the real 'difficulty' from the database
        const enrichedCourses = await Promise.all(courses.map(async (coursePayload) => {
            const courseInDb = await Course.findOne({ courseCode: coursePayload.courseCode });
            
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

module.exports = {
    calculateCurrentTerm,
    generateTargetPlan
};