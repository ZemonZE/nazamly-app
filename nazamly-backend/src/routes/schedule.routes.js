const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/auth.middleware");
const {
  addOrUpdateSchedule,
  getMySchedule,
  deleteSession,
  saveAISchedule,
  getMyTimetable,
} = require("../controllers/Schedule.controller");

// ✅ POST /api/schedule/add - إضافة أو تحديث الجدول
router.post("/add", authMiddleware, addOrUpdateSchedule);

// ✅ POST /api/schedule/save-ai - حفظ جدول ذكي من الـ AI للموبايل
router.post("/save-ai", authMiddleware, saveAISchedule);

// ✅ GET /api/schedule/my-schedule - جيب جدول الطالب
router.get("/my-schedule", authMiddleware, getMySchedule);

// ✅ GET /api/schedule/my-timetable - جيب الجدول كـ entries للموبايل
router.get("/my-timetable", authMiddleware, getMyTimetable);

// ✅ DELETE /api/schedule/session/:sessionId - امسح حصة من الجدول
router.delete("/session/:sessionId", authMiddleware, deleteSession);

module.exports = router;
