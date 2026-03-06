const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/auth.middleware");
const {
  addOrUpdateSchedule,
  getMySchedule,
  deleteSession,
} = require("../controllers/Schedule.controller");

// ✅ POST /api/schedule/add - إضافة أو تحديث الجدول
router.post("/add", authMiddleware, addOrUpdateSchedule);

// ✅ GET /api/schedule/my-schedule - جيب جدول الطالب
router.get("/my-schedule", authMiddleware, getMySchedule);

// ✅ DELETE /api/schedule/session/:sessionId - امسح حصة من الجدول
router.delete("/session/:sessionId", authMiddleware, deleteSession);

module.exports = router;
