const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/auth.middleware");
const { validateEntry } = require("../middlewares/schedule.validator");
const {
  checkScheduleConflicts,
} = require("../middlewares/conflict.middleware");
const {
  getMySchedule,
  deleteSession,
  addTimeTableEntry,
  getTimeTable,
} = require("../controllers/Schedule.controller");

// GET /api/schedule/my-schedule — returns fully populated timetable(s)
router.get("/my-schedule", authMiddleware, getMySchedule);

// DELETE /api/schedule/session/:sessionId — remove a single class entry
router.delete("/session/:sessionId", authMiddleware, deleteSession);

// POST /api/schedule/entry — add a new class entry (with validation + conflict check)
// Fix #2 + #3 applied: validator and conflict detection are now mounted here
router.post(
  "/entry",
  authMiddleware,
  validateEntry,
  checkScheduleConflicts,
  addTimeTableEntry,
);

// GET /api/schedule/:timeTableId — get a specific timetable by ID with populated entries
router.get("/:timeTableId", authMiddleware, getTimeTable);

module.exports = router;
