// src/utils/scheduleGenerator.js
const { detectConflict, timeToMinutes } = require('./timeHelpers');

/**
 * Groups sessions by Course Code AND Type (Lecture/Section).
 */
const groupCourses = (rawData) => {
    const grouped = {};
    rawData.forEach(session => {
        const key = `${session.courseCode.replace(/\s/g, '')}_${session.type}`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(session);
    });
    return grouped;
};

/**
 * Scores a valid schedule based on human-friendly constraints.
 * Prioritizes spreading out courses and penalizes catastrophic gaps.
 */
const evaluateSchedule = (schedule) => {
    let score = 1000;
    const daysMap = {};

    schedule.forEach(session => {
        if (!daysMap[session.dayOfWeek]) daysMap[session.dayOfWeek] = [];
        daysMap[session.dayOfWeek].push(session);
    });

    const totalDays = Object.keys(daysMap).length;
    score -= (totalDays * 50);

    Object.keys(daysMap).forEach(day => {
        const sessions = daysMap[day];

        if (sessions.length > 3) {
            score -= ((sessions.length - 3) * 150); 
        }

        sessions.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
        
        let dailyGapsPenalty = 0;
        
        for (let i = 0; i < sessions.length - 1; i++) {
            const endCurrent = timeToMinutes(sessions[i].endTime);
            const startNext = timeToMinutes(sessions[i + 1].startTime);
            const gap = startNext - endCurrent;
            
            if (gap > 0) {
                if (gap <= 120) {
                    dailyGapsPenalty += (gap * 0.1); 
                } else {
                    dailyGapsPenalty += (gap * 2);
                }
            }
        }
        
        score -= dailyGapsPenalty; 
    });

    return score;
};

const dayRank = {
    "Saturday": 1,
    "Sunday": 2,
    "Monday": 3,
    "Tuesday": 4,
    "Wednesday": 5,
    "Thursday": 6,
    "Friday": 7
};

/**
 * Generates top 3 strictly unique valid schedule combinations using Backtracking.
 * Includes a safety limit to prevent Node.js Event Loop blocking on massive datasets.
 */
const generateValidSchedules = (groupedData) => {
    const groups = Object.values(groupedData); 
    const validSchedules = [];
    const uniqueSignatures = new Set();
    
    // Safety mechanism: Stop searching after finding 500 valid combinations
    // to protect server RAM and CPU during peak registration times.
    const MAX_SCHEDULES_TO_FIND = 500; 

    const backtrack = (groupIndex, currentSchedule) => {
        // Early exit if we hit the performance threshold
        if (validSchedules.length >= MAX_SCHEDULES_TO_FIND) return;

        if (groupIndex === groups.length) {
            const completeSchedule = [...currentSchedule];
            const score = evaluateSchedule(completeSchedule);
            
            const signature = completeSchedule
                .map(s => `${s.courseCode}_${s.type}_${s.dayOfWeek}_${s.startTime}_${s.group||''}`)
                .sort()
                .join('|');

            if (!uniqueSignatures.has(signature)) {
                uniqueSignatures.add(signature);
                
                const sortedSchedule = completeSchedule.sort((a, b) => {
                    if (dayRank[a.dayOfWeek] !== dayRank[b.dayOfWeek]) {
                        return dayRank[a.dayOfWeek] - dayRank[b.dayOfWeek];
                    }
                    return a.startTime.localeCompare(b.startTime);
                });

                validSchedules.push({ schedule: sortedSchedule, score });
            }
            return;
        }

        const currentGroup = groups[groupIndex];

        for (let i = 0; i < currentGroup.length; i++) {
            const sessionToTest = currentGroup[i];
            const conflictResult = detectConflict([sessionToTest], currentSchedule);

            if (!conflictResult.hasConflict) {
                currentSchedule.push(sessionToTest);
                backtrack(groupIndex + 1, currentSchedule);
                currentSchedule.pop();
            }
        }
    };

    backtrack(0, []);
    
    validSchedules.sort((a, b) => b.score - a.score);
    
    return validSchedules.slice(0, 3);
};

module.exports = { groupCourses, generateValidSchedules, evaluateSchedule };