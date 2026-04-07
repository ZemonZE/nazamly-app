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

// Legacy routes
router.post("/AddOrUpdate", requireAuth, addOrUpdateSchedule);
router.get("/my-schedule", requireAuth, getMySchedule);
router.delete("/session/:sessionId", requireAuth, deleteSession);

// New routes (mobile + AI)
router.post("/save-ai", requireAuth, saveAISchedule);
router.get("/my-timetable", requireAuth, getMyTimetable);
router.post("/add-entry", requireAuth, addTimeTableEntry);
router.get("/timetable/:timeTableId", requireAuth, getTimeTable);

module.exports = router;