require("dotenv").config();
const mongoose = require("mongoose");
const {
  User,
  Department,
  Course,
  TimeTable,
  TimeTableEntry,
} = require("./src/models");

const CourseMaterial = require("./src/models/materials/courseMaterial.model");
const connectDB = require("./src/config/db");

// Mock Data from User
const rawStudents = [
  { name: "Yousef Salah", email: "yousefsalahnage@gmail.com", currentGPA: 3.84, completedCredits: 92, level: 3 },
  { name: "Abdelrahman Osama", email: "Abdo.Osama@sci.cu.edu.eg", currentGPA: 2.65, completedCredits: 92, level: 3 },
  { name: "Amr Mahmoud", email: "Amr.Mahmoud@sci.cu.edu.eg", currentGPA: 3.45, completedCredits: 75, level: 3 },
  { name: "Mohamed Waleed", email: "mohamedwa904@gmail.com", currentGPA: 2.13, completedCredits: 76, level: 3 },
  { name: "Hazem Mostafa", email: "hazem.mock@sci.cu.edu.eg", currentGPA: 2.95, completedCredits: 60, level: 4 }
];

const rawCourses = [
  { courseCode: "CS303", name: "Software Engineering", creditHours: 3, department: "CS", difficulty: 3.5 },
  { courseCode: "CS308", name: "Advanced Database", creditHours: 3, department: "CS", difficulty: 3.5 },
  { courseCode: "CS316", name: "Files Structure", creditHours: 3, department: "CS", difficulty: 2.5 },
  { courseCode: "CS317", name: "Distributed System", creditHours: 3, department: "CS", difficulty: 3 },
  { courseCode: "CS306", name: "Operating Systems", creditHours: 3, department: "CS", difficulty: 3.5 },
  { courseCode: "Math306", name: "Algorithim Analysis", creditHours: 3, department: "CS", difficulty: 1.5 }
];

const rawSessions = [
  { courseCode: "CS303", type: "Lecture", dayOfWeek: "Sunday", startTime: "14:00", endTime: "17:00", location: "م حاسب رياضه 3", group: 1 },
  { courseCode: "CS303", type: "Section", dayOfWeek: "Wednesday", startTime: "08:00", endTime: "10:00", location: "قاعة 210", group: 1 },
  { courseCode: "Math306", type: "Lecture", dayOfWeek: "Monday", startTime: "08:00", endTime: "10:00", location: "15", group: 1 },
  { courseCode: "CS306", type: "Lecture", dayOfWeek: "Thursday", startTime: "08:00", endTime: "10:00", location: "10", group: 1 },
  { courseCode: "CS306", type: "Section", dayOfWeek: "Tuesday", startTime: "14:00", endTime: "17:00", location: "م حاسب رياضه 3", group: 1 },
  { courseCode: "CS316", type: "Lecture", dayOfWeek: "Monday", startTime: "14:00", endTime: "16:00", location: "10", group: 1 }
];

const rawMaterials = [
  { courseCode: "CS303", title: "Software Engineering", driveLink: "https://drive.google.com/drive/folders/1-uPZ7C-NSy0WGxS3SdZpzCaP-oiYX4LS", type: "PDF" },
  { courseCode: "CS308", title: "Advanced Database", driveLink: "https://drive.google.com/drive/folders/1-ni2nccZlf39vrjRUgp4quRv7lr8HsLH", type: "PDF" }
];

const daysMap = { "Sunday": 0, "Monday": 1, "Tuesday": 2, "Wednesday": 3, "Thursday": 4, "Friday": 5, "Saturday": 6 };

const seedDB = async () => {
  try {
    // 1. Connect to MongoDB using the project configuration
    await connectDB();
    console.log("Connected to the database specifically for seeding.");

    // 2. Wipe existing data to prevent duplicates
    await User.deleteMany({});
    await Department.deleteMany({});
    await Course.deleteMany({});
    await TimeTable.deleteMany({});
    await TimeTableEntry.deleteMany({});
    await CourseMaterial.deleteMany({});
    console.log("Database cleared successfully.");

    // 3. Insert Students
    const mappedStudents = rawStudents.map((s, index) => ({
      firebaseUid: `mock_uid_${index}`,
      email: s.email,
      displayName: s.name,
      cgpa: s.currentGPA,
      completedHours: s.completedCredits,
      termCourses: s.name === "Hazem Mostafa" ? [] : rawCourses.map(c => ({
        name: c.name,
        courseCode: c.courseCode,
        creditHours: c.creditHours
      }))
    }));
    const insertedUsers = await User.insertMany(mappedStudents);
    console.log(`Inserted ${insertedUsers.length} Users.`);

    // 4. Create single generic department (CS) for Courses reference
    const mainDept = await Department.create({ name: "Computer Science", code: "CS" });
    console.log("Created core CS Department.");

    // 5. Insert Courses tracking their ObjectIds
    const mappedCourses = rawCourses.map((c) => ({
      courseCode: c.courseCode,
      courseName: c.name,
      creditHours: c.creditHours,
      difficulty: c.difficulty || 3,
      level: 3, // Assigned default level since the mock data missing it
      departments: [mainDept._id]
    }));
    
    const insertedCourses = await Course.insertMany(mappedCourses);
    console.log(`Inserted ${insertedCourses.length} Courses.`);

    // Create a dictionary of course codes to ObjectID
    const courseMap = {};
    for (const c of insertedCourses) {
      courseMap[c.courseCode] = c;
    }

    // 6. Map and Insert TimeTable / Sessions
    // We attach the timetable to the first student for validation passing
    const firstUserId = insertedUsers[0]._id;
    const timeTable = await TimeTable.create({
      userId: firstUserId,
      title: "Master Generated Schedule",
      sourceType: "manual"
    });

    const mappedSessions = rawSessions.map((s) => ({
      userId: firstUserId,
      timeTableId: timeTable._id,
      courseId: courseMap[s.courseCode]?._id || null,
      courseCode: s.courseCode,
      courseName: courseMap[s.courseCode]?.courseName || "Unknown",
      dayOfWeek: daysMap[s.dayOfWeek],
      startTime: s.startTime,
      endTime: s.endTime,
      groupNumber: s.group.toString(),
      sessionType: s.type,
      location: s.location
    }));

    const insertedSessions = await TimeTableEntry.insertMany(mappedSessions);
    // Link entries back to timetable
    timeTable.entries = insertedSessions.map(sess => sess._id);
    await timeTable.save();
    console.log(`Inserted ${insertedSessions.length} TimeTable Sessions mapped to Course IDs.`);

    // 7. Insert Materials
    const mappedMaterials = rawMaterials.map(m => {
      // Extract Google Drive ID from the link string
      const folderId = m.driveLink.split("folders/")[1] || "mock_id_undefined";
      return {
        courseCode: m.courseCode,
        courseName: m.title,
        driveFolderId: folderId,
        driveWebViewLink: m.driveLink
      };
    });

    const insertedMaterials = await CourseMaterial.insertMany(mappedMaterials);
    console.log(`Inserted ${insertedMaterials.length} Materials.`);

    console.log("Seeding process completed entirely.");
    process.exit(0);
  } catch (error) {
    console.error("Critical error during seeding process:", error);
    process.exit(1);
  }
};

seedDB();