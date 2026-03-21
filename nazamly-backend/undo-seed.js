require("dotenv").config();
const mongoose = require("mongoose");
const { User, Department, Course, TimeTable, TimeTableEntry } = require("./src/models");
const CourseMaterial = require("./src/models/materials/courseMaterial.model");

async function undo() {
  try {
    const MONGO_URI = process.env.MONGO_URI;
    await mongoose.connect(MONGO_URI);
    console.log("Connected to DB, clearing old seed data...");
    await User.deleteMany({});
    await Department.deleteMany({});
    await Course.deleteMany({});
    await CourseMaterial.deleteMany({});
    console.log("Cleared all seed data!");
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
undo();
