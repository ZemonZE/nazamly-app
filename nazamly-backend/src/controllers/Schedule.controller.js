const scheduleRepo = require("../Repos/Schedule_Repo");
const sessionsRepo = require("../Repos/Sessions_Repo");
const userRepo = require("../Repos/User_Repo");
const { extractScheduleTableFromImages } = require("../services/ai.service");
// ── Models no longer imported directly — all DB access goes through repos ──

/**
 * Day name → number mapping for AI-generated schedules
 */
const DAY_NAME_TO_NUMBER = {
  Saturday: 6, Sunday: 0, Monday: 1, Tuesday: 2,
  Wednesday: 3, Thursday: 4, Friday: 5,
};

const DAY_NUMBER_TO_NAME = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
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

const normalizeDigits = (value) => {
  const raw = String(value ?? "");
  const arabicMap = {
    "٠": "0",
    "١": "1",
    "٢": "2",
    "٣": "3",
    "٤": "4",
    "٥": "5",
    "٦": "6",
    "٧": "7",
    "٨": "8",
    "٩": "9",
    "۰": "0",
    "۱": "1",
    "۲": "2",
    "۳": "3",
    "۴": "4",
    "۵": "5",
    "۶": "6",
    "۷": "7",
    "۸": "8",
    "۹": "9",
  };
  return raw.replace(/[٠-٩۰-۹]/g, (d) => arabicMap[d] || d);
};

const normalizeCourseCode = (value) => {
  const raw = normalizeDigits(value).trim();
  if (!raw) return "";
  const latinPrefix = (raw.match(/[A-Za-z]+/g) || []).join("");
  const digits = (raw.match(/\d+/g) || []).join("");
  if (latinPrefix && digits) return `${latinPrefix.toUpperCase()}${digits}`;
  if (digits) return `CS${digits}`;
  return raw.toUpperCase();
};

const normalizeDayOfWeek = (value) => {
  if (typeof value === "number" && value >= 0 && value <= 6) return value;
  const raw = normalizeDigits(value).trim();
  if (!raw) return 0;
  const lower = raw.toLowerCase();
  const dayMap = {
    saturday: 6,
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    "السبت": 6,
    "الاحد": 0,
    "الأحد": 0,
    "الاثنين": 1,
    "الإثنين": 1,
    "الاثنين": 1,
    "الثلاثاء": 2,
    "الاربعاء": 3,
    "الأربعاء": 3,
    "الخميس": 4,
    "الجمعة": 5,
  };
  if (dayMap[lower] != null) return dayMap[lower];
  if (/^[0-6]$/.test(raw)) return parseInt(raw, 10);
  return 0;
};

const normalizeSessionType = (value) => {
  const raw = normalizeDigits(value).trim().toLowerCase();
  if (!raw) return "Lecture";
  if (raw.includes("lab") || raw.includes("معمل") || raw.includes("عملي") || raw.includes("ع")) return "Lab";
  if (raw.includes("sec") || raw.includes("section") || raw.includes("سكشن") || raw.includes("ت")) return "Section";
  if (raw.includes("lec") || raw.includes("lecture") || raw.includes("محاضرة") || raw.includes("ن")) return "Lecture";
  return "Lecture";
};

const normalizeTime = (value) => {
  if (!value) return "";
  let raw = normalizeDigits(value).trim().toLowerCase();
  raw = raw.replace(/\s+/g, "");
  const isPm = raw.includes("pm") || raw.includes("م");
  const isAm = raw.includes("am") || raw.includes("ص");
  raw = raw.replace(/[^0-9:]/g, "");
  const [hStr, mStr] = raw.split(":");
  let h = parseInt(hStr || "", 10);
  const m = parseInt(mStr || "0", 10);
  if (Number.isNaN(h)) return "";
  if (isPm && h < 12) h += 12;
  if (isAm && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

const ensureEndAfterStart = (startTime, endTime) => {
  const toMinutes = (t) => {
    if (!t || !t.includes(":")) return 0;
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  if (!startTime || !endTime) return endTime || startTime || "";
  if (toMinutes(endTime) > toMinutes(startTime)) return endTime;
  const [h, m] = startTime.split(":").map(Number);
  const endMins = h * 60 + m + 60;
  return `${String(Math.floor(endMins / 60) % 24).padStart(2, "0")}:${String(endMins % 60).padStart(2, "0")}`;
};

const normalizeScheduleEntry = (entry = {}) => {
  const courseCode = normalizeCourseCode(entry.courseCode || entry.courseName || entry.code || "");
  const courseName = String(entry.courseName || courseCode || "").trim();
  const sessionType = normalizeSessionType(entry.sessionType || entry.type || "");
  const dayOfWeek = normalizeDayOfWeek(entry.dayOfWeek || entry.day || entry.dayName || "");
  const startTime = normalizeTime(entry.startTime || entry.from || entry.start || "");
  const endTimeRaw = normalizeTime(entry.endTime || entry.to || entry.end || "");
  const endTime = ensureEndAfterStart(startTime, endTimeRaw);
  const groupNumber = normalizeDigits(entry.groupNumber || entry.group || "").replace(/^مجموعة\s*/i, "").trim();
  const location = String(entry.location || entry.place || "").trim();
  return {
    courseCode,
    courseName: courseName || courseCode,
    sessionType,
    dayOfWeek,
    startTime,
    endTime,
    groupNumber,
    location,
  };
};

const normalizeScheduleEntries = (entries = []) =>
  entries
    .map((entry) => normalizeScheduleEntry(entry))
    .filter((entry) => entry.courseCode && entry.startTime && entry.endTime);

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
const addOrUpdateSchedule = async (req, res) => {
  console.log("[Schedule.controller] addOrUpdateSchedule called");
  try {
    // ── OLD BRANCH (commented out — req.user.id doesn't exist with Firebase auth) ──
    // const userId = req.user.id;
    // ── END OLD BRANCH ─────────────────────────────────────────────────────────────
    const firebaseUid = req.user.uid;
    const user = await userRepo.findByFirebaseUid(firebaseUid);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    const userId = user._id;
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
  console.log("[Schedule.controller] getMySchedule called");
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
  console.log("[Schedule.controller] deleteSession called");
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
    console.error('Error deleting session:', error);
    return res.status(500).json({
      success: false,
      message: "Error deleting session"
    });
  }
};

/**
 * @desc    Update a timetable session
 * @route   PATCH /api/schedule/session/:sessionId
 * @access  Private (Authenticated User)
 */
const updateSession = async (req, res) => {
  console.log("[Schedule.controller] updateSession called");
  try {
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

    const schedules = await scheduleRepo.findByUserId(userId);
    const schedule = schedules.length > 0 ? schedules[0] : null;

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: "No schedule found for this user",
      });
    }

    const sessionIds = (schedule.entries || []).map((entry) => (entry._id || entry).toString());
    if (!sessionIds.includes(sessionId)) {
      return res.status(404).json({
        success: false,
        message: "Session not found in this schedule",
      });
    }

    const existingSession = await sessionsRepo.findById(sessionId);
    if (!existingSession) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    const updateData = {};
    const hasCourseCode = Object.prototype.hasOwnProperty.call(req.body, "courseCode");
    const hasCourseName = Object.prototype.hasOwnProperty.call(req.body, "courseName");

    if (hasCourseCode || hasCourseName) {
      const normalizedCode = normalizeCourseCode(req.body.courseCode || req.body.courseName || "");
      updateData.courseCode = normalizedCode;
      updateData.courseName = String(req.body.courseName || normalizedCode || "").trim();
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "dayOfWeek")) {
      updateData.dayOfWeek = normalizeDayOfWeek(req.body.dayOfWeek);
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "sessionType")) {
      updateData.sessionType = normalizeSessionType(req.body.sessionType);
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "location")) {
      updateData.location = req.body.location;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "groupNumber")) {
      updateData.groupNumber = normalizeDigits(req.body.groupNumber || "").trim();
    }

    const hasStartTime = Object.prototype.hasOwnProperty.call(req.body, "startTime");
    const hasEndTime = Object.prototype.hasOwnProperty.call(req.body, "endTime");
    if (hasStartTime || hasEndTime) {
      const startTime = hasStartTime
        ? normalizeTime(req.body.startTime)
        : existingSession.startTime;
      const endTimeRaw = hasEndTime
        ? normalizeTime(req.body.endTime)
        : existingSession.endTime;
      updateData.startTime = startTime;
      updateData.endTime = ensureEndAfterStart(startTime, endTimeRaw);
    }

    const updatedSession = await sessionsRepo.update(sessionId, updateData);

    return res.status(200).json({
      success: true,
      message: "Session updated successfully",
      data: updatedSession,
    });
  } catch (error) {
    console.error("Error updating session:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating session",
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
  console.log("[Schedule.controller] saveAISchedule called");
  try {
    const firebaseUid = req.user.uid;
    const { schedule, title } = req.body;

    if (!schedule || !Array.isArray(schedule) || schedule.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Schedule array is required and cannot be empty",
      });
    }

    // ── OLD BRANCH (commented out — using userRepo instead of direct User model) ──
    // const user = await User.findOne({ firebaseUid });
    // ── END OLD BRANCH ──────────────────────────────────────────────────────────────
    const user = await userRepo.findByFirebaseUid(firebaseUid);
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
  console.log("[Schedule.controller] getMyTimetable called");
  try {
    const firebaseUid = req.user.uid;

    // ── OLD BRANCH (commented out — using userRepo instead of direct User model) ──
    // const user = await User.findOne({ firebaseUid });
    // ── END OLD BRANCH ──────────────────────────────────────────────────────────────
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

/**
 * -----------------------------------------
 * USER'S CUSTOM REQUESTED CONTROLLERS
 * -----------------------------------------
 */

// المرحلة الأولى: الباك إند (إنشاء وحفظ المحاضرة)
const addTimeTableEntry = async (req, res) => {
  console.log("[Schedule.controller] addTimeTableEntry called");
  try {
    let {
      timeTableId,
      courseId,
      courseCode,
      courseName,
      dayOfWeek,
      startTime,
      endTime,
      sessionType,
      location,
      groupNumber,
    } = req.body;

    // Convert firebaseUid to our mongo ObjectId
    const user = await userRepo.findByFirebaseUid(req.user.uid);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    const userId = user._id;

    // IF TIMETABLE ID IS MISSING, FIND OR CREATE IT
    if (!timeTableId) {
      const existing = await scheduleRepo.findByUserId(userId);
      if (existing && existing.length > 0) {
        timeTableId = existing[0]._id;
      } else {
        const newSched = await scheduleRepo.create({
          userId,
          entries: [],
          title: "My Schedule",
        });
        timeTableId = newSched._id;
      }
    }

    const normalizedDay = normalizeDayOfWeek(dayOfWeek);
    const normalizedStart = normalizeTime(startTime);
    const normalizedEnd = ensureEndAfterStart(
      normalizedStart,
      normalizeTime(endTime),
    );
    const normalizedCourseCode = normalizeCourseCode(courseCode || courseName || "");
    const normalizedCourseName = String(courseName || normalizedCourseCode || "").trim();
    const normalizedType = normalizeSessionType(sessionType);

    // 1. إنشاء العنصر الجديد في قاعدة البيانات
    const newEntry = await sessionsRepo.create({
      userId,
      timeTableId,
      courseId,
      courseCode: normalizedCourseCode,
      courseName: normalizedCourseName || normalizedCourseCode,
      dayOfWeek: normalizedDay,
      startTime: normalizedStart,
      endTime: normalizedEnd,
      sessionType: normalizedType,
      location,
      groupNumber: normalizeDigits(groupNumber || "").trim(),
    });

    // 2. إضافة الـ ID الخاص بهذا العنصر إلى مصفوفة entries في الجدول الأساسي
    await scheduleRepo.addEntry(timeTableId, newEntry._id);

    return res.status(201).json({ success: true, data: newEntry });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// المرحلة الثانية: الباك إند (جلب الجدول للعرض - Populating)
const getTimeTable = async (req, res) => {
  console.log("[Schedule.controller] getTimeTable called");
  try {
    const { timeTableId } = req.params;

    const timeTable = await scheduleRepo.findById(timeTableId);

    if (!timeTable) {
      return res
        .status(404)
        .json({ success: false, message: "Timetable not found" });
    }

    return res.status(200).json({ success: true, data: timeTable });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Import classes from a schedule image/PDF via AI extraction
 * @route   POST /api/schedule/import-from-image
 * @access  Private (Authenticated User)
 *
 * Accepts a multipart file upload (image or PDF of a schedule/timetable),
 * sends it to Google Gemini AI for vision extraction,
 * and creates TimeTableEntry records from the extracted classes.
 *
 * Body: multipart/form-data with field 'file'
 */
const parseScheduleFromImage = async (req, res) => {
  console.log("[Schedule.controller] parseScheduleFromImage called");
  try {
    const files = req.files && req.files.length ? req.files : (req.file ? [req.file] : []);

    if (!files.length) {
      return res.status(400).json({
        success: false,
        message: "No image uploaded. Please upload a schedule image.",
      });
    }

    const { extractedData, usedModel } = await extractScheduleTableFromImages(files);
    const normalizedEntries = normalizeScheduleEntries(extractedData);
    console.log(`[Schedule.controller] AI raw entries: ${Array.isArray(extractedData) ? extractedData.length : 0}, normalized: ${normalizedEntries.length}`);

    if (!normalizedEntries.length) {
      return res.status(422).json({
        success: false,
        message: "Could not extract any classes from the uploaded image. Please try a clearer image or crop the table region.",
      });
    }

    const previewEntries = normalizedEntries.map((entry) => ({
      ...entry,
      dayOfWeek: DAY_NUMBER_TO_NAME[entry.dayOfWeek] || entry.dayOfWeek,
    }));

    return res.status(200).json({
      success: true,
      message: "Schedule parsed successfully",
      data: {
        entries: previewEntries,
        model: usedModel,
      },
    });
  } catch (error) {
    console.error("❌ Parse Schedule from Image Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Error parsing schedule from image",
    });
  }
};

const replaceScheduleFromImage = async (req, res) => {
  console.log("[Schedule.controller] replaceScheduleFromImage called");
  try {
    const files = req.files && req.files.length ? req.files : (req.file ? [req.file] : []);

    if (!files.length) {
      return res.status(400).json({
        success: false,
        message: "No image uploaded. Please upload a schedule image.",
      });
    }

    const firebaseUid = req.user.uid;
    const user = await userRepo.findByFirebaseUid(firebaseUid);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    const userId = user._id;

    const { extractedData, usedModel } = await extractScheduleTableFromImages(files);
    const normalizedEntries = normalizeScheduleEntries(extractedData);

    if (!normalizedEntries.length) {
      return res.status(422).json({
        success: false,
        message: "Could not extract any classes from the uploaded image. Please try a clearer image.",
      });
    }

    const existingSchedules = await scheduleRepo.findByUserId(userId);
    const existingSchedule = existingSchedules.length > 0 ? existingSchedules[0] : null;

    let timetableId;
    if (!existingSchedule) {
      const created = await scheduleRepo.create({
        userId,
        entries: [],
        title: "My Schedule",
        totalCreditHours: 0,
        sourceType: "image_import",
      });
      timetableId = created._id;
    } else {
      timetableId = existingSchedule._id;
      if (existingSchedule.entries && existingSchedule.entries.length > 0) {
        for (const oldEntry of existingSchedule.entries) {
          const entryId = oldEntry._id || oldEntry;
          await sessionsRepo.delete(entryId);
        }
      }
    }

    const entryDocs = normalizedEntries.map((entry) => ({
      userId,
      timeTableId: timetableId,
      courseCode: entry.courseCode,
      courseName: entry.courseName || entry.courseCode,
      dayOfWeek: entry.dayOfWeek,
      startTime: entry.startTime,
      endTime: entry.endTime,
      groupNumber: entry.groupNumber || "",
      sessionType: entry.sessionType,
      location: entry.location || "",
    }));

    const createdEntries = await sessionsRepo.createMany(entryDocs);
    const entryIds = createdEntries.map((entry) => entry._id);

    await scheduleRepo.update(timetableId, {
      entries: entryIds,
      title: (existingSchedule && existingSchedule.title) || "My Schedule",
      sourceType: "image_import",
    });

    return res.status(201).json({
      success: true,
      message: "Schedule replaced successfully from image",
      data: {
        timetableId,
        entriesCount: createdEntries.length,
        model: usedModel,
        entries: createdEntries.map((entry) => ({
          _id: entry._id,
          courseCode: entry.courseCode,
          courseName: entry.courseName || entry.courseCode,
          dayOfWeek: entry.dayOfWeek,
          startTime: entry.startTime,
          endTime: entry.endTime,
          sessionType: entry.sessionType,
          groupNumber: entry.groupNumber,
          location: entry.location,
        })),
      },
    });
  } catch (error) {
    console.error("❌ Replace Schedule from Image Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Error replacing schedule from image",
    });
  }
};

const importScheduleFromImage = async (req, res) => {
  console.log("[Schedule.controller] importScheduleFromImage called (legacy alias)");
  return replaceScheduleFromImage(req, res);
};

module.exports = {
  addOrUpdateSchedule,
  getMySchedule,
  deleteSession,
  updateSession,
  addTimeTableEntry,
  getTimeTable,
  saveAISchedule,
  getMyTimetable,
  parseScheduleFromImage,
  replaceScheduleFromImage,
  importScheduleFromImage,
};
