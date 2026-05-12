const { TimeTableEntry } = require('../models/schedule');
const User = require('../models/user/user.model');

const toMinutes = (timeStr) => {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

const checkScheduleConflicts = async (req, res, next) => {
  try {
    const { dayOfWeek, startTime, endTime, timeTableId } = req.body;
    const firebaseUid = req.user?.uid;

    if (!firebaseUid) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Look up MongoDB user
    const user = await User.findOne({ firebaseUid });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const existingEntries = await TimeTableEntry.find({
      userId: user._id,
      dayOfWeek: Number(dayOfWeek),
      isDeleted: { $ne: true },
    });

    const newStart = toMinutes(startTime);
    const newEnd = toMinutes(endTime);

    const conflict = existingEntries.find(entry => {
      const existStart = toMinutes(entry.startTime);
      const existEnd = toMinutes(entry.endTime);
      return newStart < existEnd && newEnd > existStart;
    });

    if (conflict) {
      return res.status(409).json({
        success: false,
        message: `Time conflict: A class already exists from ${conflict.startTime} to ${conflict.endTime} on that day.`,
        conflictWith: {
          startTime: conflict.startTime,
          endTime: conflict.endTime,
          sessionType: conflict.sessionType,
        },
      });
    }

    next();
  } catch (error) {
    console.error('[ConflictMiddleware] Error during conflict detection:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error during conflict verification.',
    });
  }
};

module.exports = { checkScheduleConflicts };