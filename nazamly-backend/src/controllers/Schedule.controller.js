const scheduleRepo = require("../Repos/Schedule_Repo");
const sessionsRepo = require("../Repos/Sessions_Repo");
const { User } = require("../models");

/**
 * Day name → number mapping for AI-generated schedules
 */
const DAY_NAME_TO_NUMBER = {
  Saturday: 6, Sunday: 0, Monday: 1, Tuesday: 2,
  Wednesday: 3, Thursday: 4, Friday: 5,
};

/**
 * AI type string → sessionType mapping
 */
function mapAIType(type) {
  if (!type) return "Lecture";
  const lower = type.toLowerCase();
  if (lower.includes("lec")) return "Lecture";
  if (lower.includes("sec")) return "Section";
  if (lower.includes("lab")) return "Lab";
  return "Lecture";
}

/**
 * Schedule Controller
 * بيتحكم في عمليات الجدول الدراسي
 * الـ Validation والـ Time Conflicts بيتعملوا في Middleware قبل ما يوصل هنا
 * بيستخدم Schedule_Repo و Sessions_Repo للتعامل مع الداتابيز
 */

/**
 * @desc    Add/Update Schedule (Create/Update)
 * @route   POST /api/schedule/add
 * @access  Private (Authenticated User)
 * Business Logic:
 * 1. بيجيب الـ userId من الـ authenticated request (req.user.id)
 * 2. بيعمل create للـ sessions الجديدة في الداتابيز عن طريق Sessions_Repo
 * 3. بيدور على جدول موجود للـ user ده عن طريق Schedule_Repo
 * 4. Case 1 (طالب جديد): بيعمل Schedule جديد ويحط فيه الـ session IDs
 * 5. Case 2 (جدول موجود): بيضيف الـ session IDs الجديدة على الجدول الموجود
 * 6. بيرجع 201 Created مع الـ document المحدث
 */
const addOrUpdateSchedule = async (req, res) => {
  try {
    const userId = req.user.id;
    const { entries, title, SemesterId } = req.body;

    // ✅ تحقق إن فيه sessions في الـ request
    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Entries array is required and cannot be empty",
      });
    }

    // ✅ اعمل create للـ entries في الداتابيز واحتفظ بالـ IDs
    const createdEntries = await sessionsRepo.createMany(
      entries.map((e) => ({ ...e, userId, timeTableId: null })),
    );
    const entryIds = createdEntries.map((e) => e._id);

    // ✅ دور على جدول موجود للـ user ده
    const existingSchedules = await scheduleRepo.findByUserId(userId);
    const schedule = existingSchedules.length > 0 ? existingSchedules[0] : null;

    let result;

    if (!schedule) {
      // ✅ Case 1: طالب جديد - اعمل جدول جديد مع الـ entries
      result = await scheduleRepo.create({
        userId,
        SemesterId,
        entries: entryIds,
        title: title || "My Schedule",
        totalCreditHours: 0,
      });

      // حدث الـ entries بالـ timeTableId
      for (const entry of createdEntries) {
        entry.timeTableId = result._id;
        await entry.save();
      }
    } else {
      // ✅ Case 2: جدول موجود - ضيف الـ entries الجديدة واحدة واحدة
      for (const entryId of entryIds) {
        await scheduleRepo.addEntry(schedule._id, entryId);
      }

      // حدث الـ entries بالـ timeTableId
      for (const entry of createdEntries) {
        entry.timeTableId = schedule._id;
        await entry.save();
      }

      // لو في title جديد، حدثه
      if (title) {
        await scheduleRepo.update(schedule._id, { title });
      }

      // جيب الجدول المحدث بالبيانات الكاملة
      result = await scheduleRepo.findByUserId(userId);
      result = result[0];
    }

    return res.status(201).json({
      success: true,
      message: !schedule
        ? "Schedule created successfully"
        : "Entries added to schedule successfully",
      data: result,
    });
  } catch (error) {
    console.error('Error adding/updating schedule:', error);
    return res.status(500).json({
      success: false,
      message: "Error adding/updating schedule"
    });
  }
};

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
    const userId = req.user.id;

    // ✅ جيب كل جداول الـ user (محمّلة بالـ sessions والـ timeTable)
    const schedules = await scheduleRepo.findByUserId(userId);

    // ✅ Empty State: لو مفيش جدول، رجع array فاضي مش 404
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
    console.error('Error retrieving schedule:', error);
    return res.status(500).json({
      success: false,
      message: "Error retrieving schedule"
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
    const userId = req.user.id;
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
    console.error('Error deleting session:', error);
    return res.status(500).json({
      success: false,
      message: "Error deleting session"
    });
  }
};

/**
 * @desc    Save an AI-generated schedule to the user's timetable
 * @route   POST /api/schedule/save-ai
 * @access  Private (Authenticated User)
 *
 * Accepts the raw AI schedule JSON (array of sessions with courseCode, type,
 * dayOfWeek, startTime, endTime, group, location) and persists it as
 * TimeTableEntries linked to a TimeTable document.
 *
 * Body: { schedule: [...], title?: string }
 */
const saveAISchedule = async (req, res) => {
  try {
    const firebaseUid = req.user.uid;
    const { schedule, title } = req.body;

    if (!schedule || !Array.isArray(schedule) || schedule.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Schedule array is required and cannot be empty",
      });
    }

    // Find the MongoDB user by Firebase UID
    const user = await User.findOne({ firebaseUid });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found. Please sync your account first.",
      });
    }
    const userId = user._id;

    // Pad single-digit time values (e.g. "8:00" → "08:00")
    const padTime = (t) => {
      if (!t) return "08:00";
      const [h, m] = t.split(":");
      return `${h.padStart(2, "0")}:${(m || "00").padStart(2, "0")}`;
    };

    // Check if user already has a schedule
    const existingSchedules = await scheduleRepo.findByUserId(userId);
    const existingSchedule = existingSchedules.length > 0 ? existingSchedules[0] : null;

    let timetableId;

    if (!existingSchedule) {
      // Create new TimeTable first (without entries)
      const created = await scheduleRepo.create({
        userId,
        entries: [],
        title: title || "AI Generated Schedule",
        totalCreditHours: 0,
        sourceType: "AI_generated",
      });
      timetableId = created._id;
    } else {
      timetableId = existingSchedule._id;
      // Soft-delete existing entries
      if (existingSchedule.entries && existingSchedule.entries.length > 0) {
        for (const oldEntry of existingSchedule.entries) {
          const entryId = oldEntry._id || oldEntry;
          await sessionsRepo.delete(entryId);
        }
      }
    }

    // Build entry documents with the real timeTableId
    const entryDocs = schedule.map((s) => ({
      userId,
      timeTableId: timetableId,
      courseCode: s.courseCode || "",
      courseName: s.courseCode || "",
      dayOfWeek: typeof s.dayOfWeek === "number"
        ? s.dayOfWeek
        : (DAY_NAME_TO_NUMBER[s.dayOfWeek] ?? 0),
      startTime: padTime(s.startTime),
      endTime: padTime(s.endTime),
      groupNumber: s.group || "",
      sessionType: mapAIType(s.type),
      location: s.location || "",
    }));

    // Create entries (timeTableId already set)
    const createdEntries = await sessionsRepo.createMany(entryDocs);
    const entryIds = createdEntries.map((e) => e._id);

    // Update the TimeTable with entry IDs
    await scheduleRepo.update(timetableId, {
      entries: entryIds,
      title: title || (existingSchedule && existingSchedule.title) || "AI Generated Schedule",
      sourceType: "AI_generated",
    });

    return res.status(201).json({
      success: true,
      message: "AI schedule saved to timetable successfully",
      data: {
        timetableId: timetableId,
        entriesCount: createdEntries.length,
      },
    });
  } catch (error) {
    console.error("❌ Save AI Schedule Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error saving AI schedule"
    });
  }
};

/**
 * @desc    Get timetable entries grouped by day for mobile display
 * @route   GET /api/schedule/my-timetable
 * @access  Private (Authenticated User)
 *
 * Returns a flat array of entry objects with courseCode, courseName,
 * dayOfWeek, startTime, endTime, sessionType, location, groupNumber
 * for the mobile app to render directly.
 */
const getMyTimetable = async (req, res) => {
  try {
    const firebaseUid = req.user.uid;

    const user = await User.findOne({ firebaseUid });
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
        message: "No timetable found",
        data: { title: "", entries: [] },
      });
    }

    const timetable = schedules[0];
    const entries = (timetable.entries || [])
      .filter((e) => e && !e.isDeleted)
      .map((e) => ({
        _id: e._id,
        courseCode: e.courseCode || "",
        courseName: e.courseName || e.courseCode || "",
        dayOfWeek: e.dayOfWeek,
        startTime: e.startTime,
        endTime: e.endTime,
        sessionType: e.sessionType,
        location: e.location || "",
        groupNumber: e.groupNumber || "",
      }));

    return res.status(200).json({
      success: true,
      message: "Timetable retrieved successfully",
      data: {
        title: timetable.title || "My Schedule",
        sourceType: timetable.sourceType || "manual",
        entries,
      },
    });
  } catch (error) {
    console.error('Error retrieving timetable:', error);
    return res.status(500).json({
      success: false,
      message: "Error retrieving timetable"
    });
  }
};

module.exports = {
  addOrUpdateSchedule,
  getMySchedule,
  deleteSession,
  saveAISchedule,
  getMyTimetable,
};
