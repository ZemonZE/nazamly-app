const scheduleRepo = require("../Repos/Schedule_Repo");
const sessionsRepo = require("../Repos/Sessions_Repo");
const userRepo = require("../Repos/User_Repo");
const mongoose = require('mongoose');
const TimeTable = mongoose.model('TimeTable');
const TimeTableEntry = mongoose.model('TimeTableEntry');

/**
 * Schedule Controller
 * بيتحكم في عمليات الجدول الدراسي
 * الـ Validation والـ Time Conflicts بيتعملوا في Middleware قبل ما يوصل هنا
 * بيستخدم Schedule_Repo و Sessions_Repo للتعامل مع الداتابيز
 */

/**
 * -----------------------------------------
 * LEGACY CONTROLLERS (Retained for Critical Usage)
 * -----------------------------------------
 */

/**
 * @desc    Retrieve Schedule (Read)
 * @route   GET /api/schedule/my-schedule
 * @access  Private (Authenticated User)
 *  * Business Logic:
 * 1. بيجيب الـ userId من الـ authenticated request (req.user.id)
 * 2. بيدور على جدول الـ user عن طريق Schedule_Repo
 * 3. لو مفيش جدول، بيرجع 200 OK مع data: [] (مش 404 عشان ميكسرش الـ Frontend)
 * 4. لو فيه جدول، بيرجعه مع الـ sessions محمّلة (populated)
 * - بيجيب جدول الطالب مع الـ sessions والـ timeTable محمّلين (populated)
 * - لو مفيش جدول بيرجع 200 OK مع data: [] (مش 404 عشان ميكسرش الـ Frontend)
 */
const getMySchedule = async (req, res) => {
  try {
    // ✅ Get MongoDB User ID from Firebase UID
    const firebaseUid = req.user.uid;
    
    const user = await userRepo.findByFirebaseUid(firebaseUid);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    
    const userId = user._id;

    const schedules = await scheduleRepo.findByUserId(userId);

    if (!schedules || schedules.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No schedule found",
        data: [],
      });
    }

    return res.status(200).json({
      success: true,
      message: "Schedule retrieved successfully",
      data: schedules,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error retrieving schedule",
      error: error.message,
    });
  }
};

/**
 * @desc    Delete Session from Schedule (Delete)
 * @route   DELETE /api/schedule/session/:sessionId
 * @access  Private (Authenticated User)
 *
 * Business Logic:
 * 1. بيجيب الـ sessionId من req.params
 * 2. بيستخدم scheduleRepo.removeSession ($pull) عشان يشيل الـ session من array الجدول
 * 3. بيعمل soft delete للـ session نفسها عن طريق sessionsRepo
 * 4. بيرجع 200 OK مع success message
 */
const deleteSession = async (req, res) => {
  try {
    // ✅ Get MongoDB User ID from Firebase UID
    const firebaseUid = req.user.uid;
    const user = await userRepo.findByFirebaseUid(firebaseUid);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    
    const userId = user._id;
    const { sessionId } = req.params;

    // ✅ دور على جدول الـ user
    const schedules = await scheduleRepo.findByUserId(userId);
    const schedule = schedules.length > 0 ? schedules[0] : null;

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: "No schedule found for this user",
      });
    }

    // ✅ شيل الـ entry من الـ entries array في الجدول ($pull)
    await scheduleRepo.removeEntry(schedule._id, sessionId);

    // ✅ Soft Delete الـ session نفسها من الداتابيز
    await sessionsRepo.delete(sessionId);

    return res.status(200).json({
      success: true,
      message: "Session removed from schedule successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error deleting session",
      error: error.message,
    });
  }
};

/**
 * -----------------------------------------
 * USER'S CUSTOM REQUESTED CONTROLLERS 
 * -----------------------------------------
 */

// المرحلة الأولى: الباك إند (إنشاء وحفظ المحاضرة)
const addTimeTableEntry = async (req, res) => {
  try {
    let { timeTableId, courseId, dayOfWeek, startTime, endTime, sessionType, location, groupNumber } = req.body;
    
    // Convert firebaseUid to our mongo ObjectId
    const user = await userRepo.findByFirebaseUid(req.user.uid);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    const userId = user._id;

    // IF TIMETABLE ID IS MISSING, FIND OR CREATE IT
    if (!timeTableId) {
      const existing = await scheduleRepo.findByUserId(userId);
      if (existing && existing.length > 0) {
        timeTableId = existing[0]._id;
      } else {
        const newSched = await TimeTable.create({ userId, entries: [], title: "My Schedule" });
        timeTableId = newSched._id;
      }
    }

    // 1. إنشاء العنصر الجديد في قاعدة البيانات
    const newEntry = await TimeTableEntry.create({
      userId, timeTableId, courseId, dayOfWeek, startTime, endTime, sessionType, location, groupNumber
    });

    // 2. إضافة الـ ID الخاص بهذا العنصر إلى مصفوفة entries في الجدول الأساسي
    await TimeTable.findByIdAndUpdate(
      timeTableId,
      { $push: { entries: newEntry._id } },
      { new: true }
    );

    return res.status(201).json({ success: true, data: newEntry });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// المرحلة الثانية: الباك إند (جلب الجدول للعرض - Populating)
const getTimeTable = async (req, res) => {
  try {
    const { timeTableId } = req.params;

    const timeTable = await TimeTable.findById(timeTableId)
      .populate({
        path: 'entries', // جلب تفاصيل المحاضرات
        populate: {
          path: 'courseId', // بداخل كل محاضرة، اجلب تفاصيل المادة
          select: 'courseName courseCode color' // updated to match actual DB fields courseName & courseCode
        }
      });

    if (!timeTable) {
        return res.status(404).json({ success: false, message: "Timetable not found" });
    }

    return res.status(200).json({ success: true, data: timeTable });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getMySchedule,
  deleteSession,
  addTimeTableEntry,
  getTimeTable
};
