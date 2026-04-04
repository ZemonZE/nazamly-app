require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');

// Register models
require('./src/models/user/user.model');
require('./src/models/academic/course.model');
require('./src/models/academic/semester.model');
require('./src/models/academic/department.model');
require('./src/models/schedule/timeTableEntry.model');
require('./src/models/schedule/timeTable.model');

const Schedule = mongoose.model('TimeTable');
const TimeTableEntry = mongoose.model('TimeTableEntry');
const User = mongoose.model('User');

async function checkDB() {
  let logStr = "";
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/nazamly-app', { 
      useNewUrlParser: true, 
      useUnifiedTopology: true 
    });
    logStr += "Connected to DB!\n";

    const schedules = await Schedule.find({}).populate({
      path: 'entries',
      populate: { path: 'courseId' }
    });

    logStr += `Found ${schedules.length} schedules\n`;
    schedules.forEach((sche, index) => {
      logStr += `Schedule ${index + 1}: ID: ${sche._id}, Entries count: ${sche.entries.length}\n`;
      sche.entries.forEach((e, i) => {
        logStr += `   Entry ${i}: _id=${e._id}, dayOfWeek=${e.dayOfWeek}\n`;
      });
    });

    fs.writeFileSync('check-schedule.log', logStr);
  } catch (err) {
    fs.writeFileSync('check-schedule.log', "Error: " + err.message);
  } finally {
    process.exit(0);
  }
}

checkDB();
