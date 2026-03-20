require('dotenv').config();
const connectDB = require('./src/config/db');
const mongoose = require('mongoose');

// Register all models
require('./src/models/user/user.model');
require('./src/models/academic/course.model');
require('./src/models/academic/department.model');
require('./src/models/schedule/timeTableEntry.model');
require('./src/models/schedule/timeTable.model');

const Schedule = mongoose.model('TimeTable');
const TimeTableEntry = mongoose.model('TimeTableEntry');

async function testFetch() {
  try {
    await connectDB();
    
    console.log("Connected to DB successfully.");
    const schedules = await Schedule.find({});
    console.log("Raw Schedules Count:", schedules.length);
    if (schedules.length > 0) {
      console.log("First Schedule Entries Count:", schedules[0].entries.length);
      console.log("First Schedule Document:", schedules[0]);
    }
    
    const entries = await TimeTableEntry.find({});
    console.log("Total entries in DB:", entries.length);
    if (entries.length > 0) {
      console.log("Last entry:", entries[entries.length - 1]);
    }

  } catch (err) {
    console.error("Test fetch Error:", err);
  } finally {
    process.exit(0);
  }
}

testFetch();
