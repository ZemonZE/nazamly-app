// src/utils/gpaCalculator.js

const GRADUATION_HOURS = 146;
const MAX_REASONABLE_MARK = 95; 

const convertMarkToPoints = (mark) => {
    if (mark < 60) return 0.0;
    if (mark > 100) return 5.0;
    return Number(((mark / 10) - 5).toFixed(1));
};

const getGradeRating = (mark) => {
    if (mark >= 85) return 'Excellent'; 
    if (mark >= 75) return 'Very Good'; 
    if (mark >= 65) return 'Good';      
    if (mark >= 60) return 'Pass';      
    return 'Fail';                      
};

/**
 * Calculates the GPA for the current term.
 */
const calculateTermGPA = (courses) => {
    let termQualityPoints = 0;
    let divisorTermHours = 0; 

    courses.forEach(course => {
        if (typeof course.mark === 'number' && course.mark >= 0 && course.mark <= 100) {
            const gradePoint = convertMarkToPoints(course.mark);
            termQualityPoints += (gradePoint * course.creditHours);
            divisorTermHours += course.isRetake ? (course.creditHours * 2) : course.creditHours;
        }
    });

    if (divisorTermHours === 0) return { termGPA: 0, divisorTermHours: 0 };

    const termGPA = Number((termQualityPoints / divisorTermHours).toFixed(2));
    return { termGPA, divisorTermHours };
};

/**
 * Calculates the Expected CGPA combining old history and new term.
 */
const calculateExpectedCGPA = (oldCGPA, oldHours, termGPA, divisorTermHours) => {
    const pastPoints = oldCGPA * oldHours;
    const currentTermPoints = termGPA * divisorTermHours;
    
    const totalCombinedPoints = pastPoints + currentTermPoints;
    const totalCombinedHours = oldHours + divisorTermHours;

    if (totalCombinedHours === 0) return 0;

    return Number((totalCombinedPoints / totalCombinedHours).toFixed(4));
};

/**
 * Smart Target Strategy with Upper Bound Clamping.
 * Distributes marks proportionally based on difficulty, avoiding impossible targets.
 */
const calculateSmartTargetStrategy = (targetCGPA, oldCGPA, oldHours, currentCourses) => {
    let termHours = 0;
    currentCourses.forEach(course => termHours += course.creditHours);

    if (termHours === 0) return { isPossible: false, message: 'No courses provided.' };

    const totalTargetPoints = targetCGPA * (oldHours + termHours);
    const pastPoints = oldCGPA * oldHours;
    const requiredTotalTermPoints = totalTargetPoints - pastPoints;
    const requiredTermGPA = requiredTotalTermPoints / termHours;

    if (requiredTermGPA > 5.0) {
        const maxPossiblePointsThisTerm = 5.0 * termHours;
        const maxPossibleCGPA = (pastPoints + maxPossiblePointsThisTerm) / (oldHours + termHours);
        
        return { 
            isPossible: false, 
            message: `Target impossible. Even with 100% in all courses, your max CGPA will be ${maxPossibleCGPA.toFixed(4)}.`
        };
    }

    const coursesWithEasiness = currentCourses.map(c => ({ ...c, easiness: 6 - c.difficulty }));
    const totalWeightedEasiness = coursesWithEasiness.reduce((sum, c) => sum + (c.easiness * c.creditHours), 0);
    const averageEasiness = totalWeightedEasiness / termHours;

    const requiredAverageMark = (Math.max(requiredTermGPA, 1.0) + 5) * 10;
    let beta = 0;
    const maxE = Math.max(...coursesWithEasiness.map(c => c.easiness));
    const minE = Math.min(...coursesWithEasiness.map(c => c.easiness));
    
    if (maxE !== averageEasiness) {
        const betaUp = (maxE > averageEasiness) ? (MAX_REASONABLE_MARK - requiredAverageMark) / (maxE - averageEasiness) : 10;
        const betaDown = (minE < averageEasiness) ? (requiredAverageMark - 60) / (averageEasiness - minE) : 10;
        beta = Math.min(betaUp, betaDown);
    }

    let plan = coursesWithEasiness.map(course => {
        let targetMark = Math.ceil(requiredAverageMark + beta * (course.easiness - averageEasiness));
        return {
            ...course,
            targetMark: Math.max(60, Math.min(100, targetMark))
        };
    });

    // 4. Dynamic Fine-tuning (Credit-Hour Aware)
    let currentPoints = plan.reduce((sum, c) => sum + (convertMarkToPoints(c.targetMark) * c.creditHours), 0);
    
    // Use a while loop to dynamically fill the gap point-by-point until the exact target is met
    while (currentPoints < requiredTotalTermPoints) {
        // Sort ascending by difficulty so we always add marks to the easiest available courses first
        plan.sort((a, b) => a.difficulty - b.difficulty); 
        
        let pointAdded = false;
        
        for (let course of plan) {
            // Only add marks if the course hasn't hit our logical cap
            if (course.targetMark < MAX_REASONABLE_MARK) {
                course.targetMark += 1; 
                pointAdded = true;
                break; // Break the FOR loop to recalculate total points in the WHILE loop
            }
        }
        
        // Safety net: if all courses reached the MAX cap and we still need points, we must break to avoid infinite loops
        if (!pointAdded) {
            break; 
        }

        // Recalculate the exact current points taking credit hours into account after the tweak
        currentPoints = plan.reduce((sum, c) => sum + (convertMarkToPoints(c.targetMark) * c.creditHours), 0);
    }

    return {
        isPossible: true,
        targetCGPA,
        requiredTermAverageGPA: Number(requiredTermGPA.toFixed(2)),
        plan: plan.map(c => ({
            courseCode: c.courseCode,
            difficulty: c.difficulty,
            targetMark: c.targetMark,
            targetRating: getGradeRating(c.targetMark)
        }))
    };
};

// Exporting ALL functions correctly so the controller can find them
module.exports = {
    GRADUATION_HOURS,
    MAX_REASONABLE_MARK,
    convertMarkToPoints,
    getGradeRating,
    calculateTermGPA,
    calculateExpectedCGPA,
    calculateSmartTargetStrategy
};