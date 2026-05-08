const express = require("express");
const router = express.Router();

// FIXED: Renamed the variable to match the routes below
const requireAuth = require("../middlewares/auth.middleware");
const imageUpload = require("../middlewares/imageUpload.middleware");

const {
  saveTimetable,
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

// ── Unified Routes ──

/**
 * @route   POST /api/schedule/save-timetable
 * @desc    Save/Update unified timetable and sync timeTableId to User Profile
 * @access  Private
 */
router.post("/save-timetable", requireAuth, saveTimetable);

/**
 * @route   GET /api/schedule/active-id
 * @desc    Get the current active timeTableId from the user's profile
 * @access  Private
 */
router.get("/active-id", requireAuth, async (req, res) => {
    try {
        const userRepo = require("../Repos/User_Repo");
        const student = await userRepo.findByFirebaseUid(req.user.uid);
        res.json({ success: true, timeTableId: student?.timeTableId || null });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

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
 * @desc    Upload schedule image → AI extract → preview entries
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
 * @desc    Upload schedule image → AI extract → replace timetable entries
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
 * @desc    Upload schedule image/PDF → AI extract → add classes to timetable
 * @access  Private
 */
router.post(
  "/import-from-image",
  requireAuth,
  imageUpload.single("file"),
  importScheduleFromImage,
);

module.exports = router;
