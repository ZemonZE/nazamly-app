// seed.js
require('dotenv').config();
const mongoose = require('mongoose');

const User = require('./src/models/user.model');
const Course = require('./src/models/course.model');

const seedDatabase = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('🟢 Connected to MongoDB Atlas for Seeding...');

        // 1. Clear existing data (Be careful: this wipes everything!)
        await User.deleteMany({});
        await Course.deleteMany({});
        console.log('🧹 Cleared old data.');

        // 2. Seed Multiple Users (Array of students)
        const students = [
            {
                name: 'Yousef Salah',
                email: 'yousef.salah@cu.edu.eg',
                cgpa: 3.845,
                completedHours: 74,
                firebaseUid: 'dummy_firebase_uid_12345'
            },
            {
                name: 'Amr Mahmoud',
                email: 'amr.mahmoud@cu.edu.eg',
                cgpa: 2.7,
                completedHours: 74,
                firebaseUid: 'Amr123'
            },
            {
                name: 'Abdo',
                email: 'abdo@cu.edu.eg',
                cgpa: 2.626,
                completedHours: 74,
                firebaseUid: 'Abdo123'
            }
        ];
        
        // Insert all students at once
        await User.insertMany(students);
        console.log(`👥 ${students.length} Students seeded successfully!`);

        // 3. Seed Courses with real difficulty
        const courses = [
            { courseCode: '305ر', courseName: 'Computer Graphics', creditHours: 3, difficulty: 1, courseId: new mongoose.Types.ObjectId() },
            { courseCode: '304س', courseName: 'Software Engineering', creditHours: 3, difficulty: 2, courseId: new mongoose.Types.ObjectId() },
            { courseCode: '302س', courseName: 'Networks', creditHours: 3, difficulty: 2.5, courseId: new mongoose.Types.ObjectId() },
            { courseCode: '307س', courseName: 'Database 2', creditHours: 3, difficulty: 3, courseId: new mongoose.Types.ObjectId() },
            { courseCode: '305س', courseName: 'AI', creditHours: 3, difficulty: 4, courseId: new mongoose.Types.ObjectId() },
            { courseCode: '309س', courseName: 'Operations Research', creditHours: 3, difficulty: 4, courseId: new mongoose.Types.ObjectId() }
        ];
        
        await Course.insertMany(courses);
        console.log('📚 Courses seeded successfully!');

        console.log('✅ Seeding completely finished. You can now exit.');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error during seeding:', error);
        process.exit(1);
    }
};

seedDatabase();