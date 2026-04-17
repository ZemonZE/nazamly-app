require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("./src/config/db");
const {
  User,
  Department,
  Course,
  CourseInstance,
  Doctor,
  Semester,
  GPAPlan,
  TimeTable,
  TimeTableEntry,
  MaterialsFolder,
  MaterialFile,
  Chapter
} = require("./src/models");

const seedDB = async () => {
  try {
    // 1. Connect to MongoDB
    await connectDB();
    console.log("Connected to the database for seeding.");

    // 2. Wipe existing data
    const collections = [
      User, Department, Course, CourseInstance, Doctor,
      Semester, GPAPlan, TimeTable, TimeTableEntry,
      MaterialsFolder, MaterialFile, Chapter
    ];
    for (const model of collections) {
      await model.deleteMany({});
    }
    console.log("Database cleared successfully.");

    // 3. Insert Departments
    const departments = await Department.insertMany([
      { name: "Computer Science", code: "CS" },
      { name: "Mathematics", code: "MATH" },
      { name: "Physics", code: "PHYS" },
      { name: "Information Technology", code: "IT" }
    ]);
    const deptMap = {};
    departments.forEach(d => deptMap[d.code] = d._id);
    console.log(`Inserted ${departments.length} Departments.`);

    // 4. Insert Courses
    const coursesData = [
      { courseCode: "CS303", courseName: "Software Engineering", level: 3, creditHours: 3, difficulty: 3.5, department: "CS", departments: [deptMap["CS"]] },
      { courseCode: "CS308", courseName: "Advanced Database", level: 3, creditHours: 3, difficulty: 3.5, department: "CS", departments: [deptMap["CS"]] },
      { courseCode: "CS316", courseName: "Files Structure", level: 3, creditHours: 3, difficulty: 2.5, department: "CS", departments: [deptMap["CS"]] },
      { courseCode: "CS317", courseName: "Distributed Systems", level: 3, creditHours: 3, difficulty: 3, department: "CS", departments: [deptMap["CS"]] },
      { courseCode: "MATH306", courseName: "Algorithm Analysis", level: 3, creditHours: 3, difficulty: 1.5, department: "MATH", departments: [deptMap["MATH"]] },
      { courseCode: "PHYS101", courseName: "General Physics I", level: 1, creditHours: 3, difficulty: 4, department: "PHYS", departments: [deptMap["PHYS"]] }
    ];
    const insertedCourses = await Course.insertMany(coursesData);
    const courseMap = {};
    insertedCourses.forEach(c => courseMap[c.courseCode] = c._id);
    console.log(`Inserted ${insertedCourses.length} Courses.`);

    // 5. Insert Users
    const usersData = [
      {
        firebaseUid: "mock_uid_yousef",
        email: "yousefsalahnage@gmail.com",
        displayName: "Yousef Salah",
        currentCGPA: 3.84,
        earnedCreditHours: 92,
        pastSemesters: [
          { termName: "Fall 2024", termGPA: 3.9 },
          { termName: "Spring 2024", termGPA: 3.78 }
        ]
      },
      {
        firebaseUid: "mock_uid_abdo",
        email: "Abdo.Osama@sci.cu.edu.eg",
        displayName: "Abdelrahman Osama",
        currentCGPA: 2.65,
        earnedCreditHours: 92,
        pastSemesters: [
          { termName: "Fall 2024", termGPA: 2.5 },
          { termName: "Spring 2024", termGPA: 2.8 }
        ]
      }
    ];
    const insertedUsers = await User.insertMany(usersData);
    console.log(`Inserted ${insertedUsers.length} Users.`);

    // 6. Insert Doctors
    const doctorsData = [
      { name: "Dr. Ahmed Ali", email: "ahmed.ali@sci.cu.edu.eg" },
      { name: "Dr. Sarah Mohamed", email: "sarah.m@sci.cu.edu.eg" }
    ];
    const insertedDoctors = await Doctor.insertMany(doctorsData);
    console.log(`Inserted ${insertedDoctors.length} Doctors.`);

    // 7. Insert CourseInstances
    const courseInstancesData = [
      { courseId: courseMap["CS303"], doctorId: insertedDoctors[0]._id, academicYear: "2025/2026", semester: "Spring" },
      { courseId: courseMap["CS308"], doctorId: insertedDoctors[1]._id, academicYear: "2025/2026", semester: "Spring" }
    ];
    const insertedInstances = await CourseInstance.insertMany(courseInstancesData);
    console.log(`Inserted ${insertedInstances.length} CourseInstances.`);

    // 8. Insert MaterialsFolders
    const foldersData = [
      { courseInstanceId: insertedInstances[0]._id, title: "Lectures", driveFolderId: "mock_folder_se_lectures" },
      { courseInstanceId: insertedInstances[0]._id, title: "Labs", driveFolderId: "mock_folder_se_labs" },
      { courseInstanceId: insertedInstances[1]._id, title: "Materials", driveFolderId: "mock_folder_db_materials" }
    ];
    const insertedFolders = await MaterialsFolder.insertMany(foldersData);
    console.log(`Inserted ${insertedFolders.length} MaterialsFolders.`);

    // 9. Insert MaterialFiles
    const filesData = [
      { folderId: insertedFolders[0]._id, title: "Introduction.pdf", fileType: "pdf", driveFileId: "mock_file_se_intro", driveWebViewLink: "https://example.com/se_intro" },
      { folderId: insertedFolders[1]._id, title: "Project Requirements.slides", fileType: "slides", driveFileId: "mock_file_se_proj", driveWebViewLink: "https://example.com/se_proj" }
    ];
    await MaterialFile.insertMany(filesData);
    console.log(`Inserted ${filesData.length} MaterialFiles.`);

    // 10. Insert Semesters for Users
    const semestersData = [
      { userId: insertedUsers[0]._id, semesterNumber: 6, type: "planned", year: 2025 },
      { userId: insertedUsers[0]._id, semesterNumber: 5, type: "completed", year: 2024 },
      { userId: insertedUsers[1]._id, semesterNumber: 6, type: "planned", year: 2025 }
    ];
    await Semester.create(semestersData);
    console.log(`Inserted Semesters for Users.`);

    // 11. Insert GPAPlans
    const gpaPlansData = [
      { userId: insertedUsers[0]._id, currentGPA: 3.84, completedCredits: 92, targetGPA: 3.9, targetCredits: 132 },
      { userId: insertedUsers[1]._id, currentGPA: 2.65, completedCredits: 92, targetGPA: 3.0, targetCredits: 132 }
    ];
    await GPAPlan.insertMany(gpaPlansData);
    console.log(`Inserted GPAPlans for Users.`);

    // 12. Insert TimeTables and Entries
    const timeTable = await TimeTable.create({
      userId: insertedUsers[0]._id,
      title: "Spring 2026 Schedule",
      sourceType: "manual"
    });

    const sessions = [
      {
        userId: insertedUsers[0]._id,
        timeTableId: timeTable._id,
        courseId: courseMap["CS303"],
        courseCode: "CS303",
        courseName: "Software Engineering",
        dayOfWeek: 0, // Sunday
        startTime: "14:00",
        endTime: "17:00",
        groupNumber: "1",
        sessionType: "Lecture",
        location: "Hall 3"
      },
      {
        userId: insertedUsers[0]._id,
        timeTableId: timeTable._id,
        courseId: courseMap["CS316"],
        courseCode: "CS316",
        courseName: "Files Structure",
        dayOfWeek: 1, // Monday
        startTime: "14:00",
        endTime: "16:00",
        groupNumber: "1",
        sessionType: "Lecture",
        location: "Lab 10"
      }
    ];
    const insertedSessions = await TimeTableEntry.insertMany(sessions);
    timeTable.entries = insertedSessions.map(s => s._id);
    await timeTable.save();
    console.log(`Inserted TimeTable and ${insertedSessions.length} sessions.`);

    console.log("Seeding process completed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Critical error during seeding process:", error);
    process.exit(1);
  }
};

seedDB();