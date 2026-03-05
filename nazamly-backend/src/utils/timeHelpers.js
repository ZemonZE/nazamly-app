// src/utils/timeHelpers.js

/**
 * Converts a time string (HH:MM) to total minutes from midnight.
 * This allows mathematical comparison between different times.
 */
const timeToMinutes = (timeString) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    return (hours * 60) + minutes;
};

/**
 * Detects time conflicts between new sessions and existing sessions.
 * Returns an object indicating if a conflict exists and a descriptive message.
 */
const detectConflict = (newSessions, existingSessions = []) => {
    // Merge all sessions into a single array for comprehensive checking
    const allSessions = [...existingSessions, ...newSessions];

    for (let i = 0; i < allSessions.length; i++) {
        for (let j = i + 1; j < allSessions.length; j++) {
            const sessionA = allSessions[i];
            const sessionB = allSessions[j];

            // Skip comparison if sessions are on different days
            if (sessionA.dayOfWeek !== sessionB.dayOfWeek) {
                continue;
            }

            // Convert both session times to minutes for comparison
            const startA = timeToMinutes(sessionA.startTime);
            const endA = timeToMinutes(sessionA.endTime);
            const startB = timeToMinutes(sessionB.startTime);
            const endB = timeToMinutes(sessionB.endTime);

            // Conflict logic: (startA < endB) AND (endA > startB)
            if (startA < endB && endA > startB) {
                return {
                    hasConflict: true,
                    message: `Conflict! Day: ${sessionA.dayOfWeek} | Between [${sessionA.courseName}] and [${sessionB.courseName}]`
                };
            }
        }
    }
    
    // No conflicts found
    return { hasConflict: false };
};


// // ==========================================
// // Testing Zone (Mock Data)
// // ==========================================

// // Mock data simulating an existing schedule from the database
// const mockExistingSchedule = [
//     { courseName: 'Computer Graphics', dayOfWeek: 'Sunday', startTime: '09:00', endTime: '11:00' }
// ];

// // Mock data simulating incoming payload from the frontend
// const mockNewPayload = [
//     // Safe session (different day)
//     { courseName: 'AI Engineering', dayOfWeek: 'Monday', startTime: '10:00', endTime: '12:00' },
//     // Conflict session (same day, overlapping time)
//     { courseName: 'Database Design', dayOfWeek: 'Sunday', startTime: '10:30', endTime: '12:30' }
// ];

// // Execute the algorithm and log the result
// const result = detectConflict(mockNewPayload, mockExistingSchedule);
// console.log("🚦 Test Result:", result);

module.exports = { timeToMinutes, detectConflict };