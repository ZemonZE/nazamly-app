// test.js
const { groupCourses, generateValidSchedules } = require('./src/utils/scheduleGenerator');

// Dummy data simulating the extracted information from Gemini AI
// FIXED: Changed 'day' to 'dayOfWeek' to match timeHelpers.js contract
const dummyExtractedData = [
    // 1. Computer Graphics - Lecture
    {
        courseCode: '305r',
        courseName: 'Computer Graphics',
        type: 'Lecture',
        instructor: 'Dr. Ahmed',
        dayOfWeek: 'Monday', 
        startTime: '09:00',
        endTime: '11:00',
        location: 'Hall 1'
    },
    // 2. Computer Graphics - Section Option A (Valid)
    {
        courseCode: '305r',
        courseName: 'Computer Graphics',
        type: 'Section',
        instructor: 'Eng. Mahmoud',
        dayOfWeek: 'Wednesday',
        startTime: '12:00',
        endTime: '14:00',
        location: 'Lab 3' 
    },
    // 3. Computer Graphics - Section Option B (Conflicts with SE Lecture)
    {
        courseCode: '305r',
        courseName: 'Computer Graphics',
        type: 'Section',
        instructor: 'Eng. Ali',
        dayOfWeek: 'Monday',
        startTime: '11:00',
        endTime: '13:00',
        location: 'Lab 1' 
    },
    // 4. Software Engineering - Lecture
    {
        courseCode: '304s',
        courseName: 'Software Engineering',
        type: 'Lecture',
        instructor: 'Dr. Mona',
        dayOfWeek: 'Monday',
        startTime: '11:30',
        endTime: '13:30',
        location: 'Hall 2'
    }
];

console.log('--- Step 1: Grouping Courses ---');
const grouped = groupCourses(dummyExtractedData);
console.log('Detected required components:', Object.keys(grouped));

console.log('\n--- Step 2: Generating Valid Schedules ---');
const validSchedules = generateValidSchedules(grouped);

console.log(`\n✅ Found ${validSchedules.length} valid schedule(s) out of possible combinations.`);
validSchedules.forEach((schedule, index) => {
    console.log(`\n📅 Schedule #${index + 1}:`);
    schedule.forEach(session => {
        console.log(`- ${session.courseName} (${session.type}) | ${session.dayOfWeek} [${session.startTime} to ${session.endTime}]`);
    });
});