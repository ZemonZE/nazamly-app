const scheduleRepo = require("../Repos/Schedule_Repo");
const sessionsRepo = require("../Repos/Sessions_Repo");

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
    return res.status(500).json({
      success: false,
      message: "Error adding/updating schedule",
      error: error.message,
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
    return res.status(500).json({
      success: false,
      message: "Error deleting session",
      error: error.message,
    });
  }
};

module.exports = {
  addOrUpdateSchedule,
  getMySchedule,
  deleteSession,
};
