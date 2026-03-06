// Root barrel export — re-exports all models from subfolders
const { User } = require("./user");
const { Department, Course, CourseInstance, Doctor, Semester, Enrollment } = require("./academic");
const { GPAPlan, GPARecord, CourseGrade } = require("./gpa");
const { TimeTable, TimeTableEntry } = require("./schedule");
const { MaterialsFolder, MaterialFile, Chapter } = require("./materials");
const { QuizTemplate, QuizAttempt } = require("./quiz");
const { ExamSource, ExtractedQuestion, GeneratedQuestion, DoctorInsight, WeaknessAnalysis } = require("./ai");

module.exports = {
  // User
  User,

  // Academic
  Department,
  Course,
  CourseInstance,
  Doctor,
  Semester,
  Enrollment,

  // GPA
  GPAPlan,
  GPARecord,
  CourseGrade,

  // Schedule
  TimeTable,
  TimeTableEntry,

  // Materials
  MaterialsFolder,
  MaterialFile,
  Chapter,

  // Quiz
  QuizTemplate,
  QuizAttempt,

  // AI
  ExamSource,
  ExtractedQuestion,
  GeneratedQuestion,
  DoctorInsight,
  WeaknessAnalysis,
};
