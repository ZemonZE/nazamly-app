const express = require("express");
const router = express.Router();

// FIXED: Renamed the variable to match the routes below
const requireAuth = require("../middlewares/auth.middleware"); 

const {
  addOrUpdateSchedule,
  getMySchedule,
  deleteSession,
  saveAISchedule,
  getMyTimetable,
  addTimeTableEntry,
  getTimeTable,
} = require("../controllers/Schedule.controller");

// ── Legacy Routes ──

/**
 * @route   POST /api/schedule/AddOrUpdate
 * @desc    Add or update user's schedule
 * @access  Private
 */
router.post("/AddOrUpdate", requireAuth, addOrUpdateSchedule);

/**
 * @route   GET /api/schedule/my-schedule
 * @desc    Get the active schedule for the user
 * @access  Private
 */
router.get("/my-schedule", requireAuth, getMySchedule);

/**
 * @route   DELETE /api/schedule/session/:sessionId
 * @desc    Delete a specific session from schedule
 * @access  Private
 */
router.delete("/session/:sessionId", requireAuth, deleteSession);

// ── New Routes (Mobile + AI) ──

/**
 * @route   POST /api/schedule/save-ai
 * @desc    Save an AI-generated schedule
 * @access  Private
 */
router.post("/save-ai", requireAuth, saveAISchedule);

/**
 * @route   GET /api/schedule/my-timetable
 * @desc    Get complete timetable including AI states
 * @access  Private
 */
router.get("/my-timetable", requireAuth, getMyTimetable);

/**
 * @route   POST /api/schedule/add-entry
 * @desc    Add entry to timetable Manually
 * @access  Private
 */
router.post("/add-entry", requireAuth, addTimeTableEntry);

/**
 * @route   GET /api/schedule/timetable/:timeTableId
 * @desc    Get specific timetable by ID
 * @access  Private
 */
router.get("/timetable/:timeTableId", requireAuth, getTimeTable);

module.exports = router;
