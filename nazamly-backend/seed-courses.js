require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('./src/models/academic/course.model');
const Doctor = require('./src/models/academic/doctor.model');
const CourseInstance = require('./src/models/academic/courseInstance.model');

const MONGO_URI = process.env.MONGO_URI;

const courses = [
  { courseCode: 'CS301', courseName: 'OS & Multithreading', level: 3, creditHours: 3, department: 'CS' },
  { courseCode: 'CS302', courseName: 'Database 2', level: 3, creditHours: 3, department: 'CS' },
  { courseCode: 'CS303', courseName: 'Software Engineering', level: 3, creditHours: 3, department: 'CS' },
  { courseCode: 'CS304', courseName: 'Distributed Systems', level: 3, creditHours: 3, department: 'CS' },
  { courseCode: 'CS305', courseName: 'File Structure', level: 3, creditHours: 3, department: 'CS' },
  { courseCode: 'CS306', courseName: 'Compilers', level: 3, creditHours: 3, department: 'CS' },
  { courseCode: 'CS307', courseName: 'Cryptography', level: 3, creditHours: 3, department: 'CS' },
  { courseCode: 'CS308', courseName: 'Network Security', level: 3, creditHours: 3, department: 'CS' },
];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    let doctor = await Doctor.findOne({ name: 'TBA' });
    if (!doctor) {
      doctor = await Doctor.create({ name: 'TBA', email: 'tba@university.edu' });
      console.log('Created default doctor:', doctor._id);
    } else {
      console.log('Using existing doctor:', doctor._id);
    }

    const createdCourses = [];
    for (const c of courses) {
      let existing = await Course.findOne({ courseCode: c.courseCode });
      if (!existing) {
        existing = await Course.create(c);
        console.log(`Created course: ${c.courseName} (${c.courseCode})`);
      } else {
        console.log(`Course already exists: ${c.courseName} (${c.courseCode})`);
      }
      createdCourses.push(existing);
    }

    for (const course of createdCourses) {
      const exists = await CourseInstance.findOne({
        courseId: course._id,
        academicYear: '2025/2026',
        semester: 'Spring'
      });
      if (!exists) {
        await CourseInstance.create({
          courseId: course._id,
          doctorId: doctor._id,
          academicYear: '2025/2026',
          semester: 'Spring'
        });
        console.log(`Created instance: ${course.courseName} - Spring 2025/2026`);
      } else {
        console.log(`Instance already exists: ${course.courseName} - Spring 2025/2026`);
      }
    }

    console.log('\n✅ Seed complete!');
    await mongoose.disconnect();
  } catch (err) {
    console.error('Seed error:', err.message);
    process.exit(1);
  }
}

seed();
