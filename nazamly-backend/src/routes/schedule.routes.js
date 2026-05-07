const express = require("express");
const router = express.Router();

// FIXED: Renamed the variable to match the routes below
const requireAuth = require("../middlewares/auth.middleware");
const imageUpload = require("../middlewares/imageUpload.middleware");

const {
  addOrUpdateSchedule,
  getMySchedule,
  deleteSession,
  updateSession,
  saveAISchedule,
  getMyTimetable,
  addTimeTableEntry,
  getTimeTable,
  parseScheduleFromImage,
  replaceScheduleFromImage,
  importScheduleFromImage,
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

/**
 * @route   PATCH /api/schedule/session/:sessionId
 * @desc    Update a specific session
 * @access  Private
 */
router.patch("/session/:sessionId", requireAuth, updateSession);

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

/**
 * @route   POST /api/schedule/parse-from-image
 * @desc    Upload schedule image → OCR extract → preview entries
 * @access  Private
 */
router.post(
  "/parse-from-image",
  requireAuth,
  imageUpload.single("file"),
  parseScheduleFromImage,
);

/**
 * @route   POST /api/schedule/replace-from-image
 * @desc    Upload schedule image → OCR extract → replace timetable entries
 * @access  Private
 */
router.post(
  "/replace-from-image",
  requireAuth,
  imageUpload.single("file"),
  replaceScheduleFromImage,
);

/**
 * @route   POST /api/schedule/import-from-image
 * @desc    Upload schedule image/PDF → OCR extract → add classes to timetable
 * @access  Private
 */
router.post(
  "/import-from-image",
  requireAuth,
  imageUpload.single("file"),
  importScheduleFromImage,
);

module.exports = router;
