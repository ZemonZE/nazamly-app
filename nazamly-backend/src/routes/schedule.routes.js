const express = require("express");
const router = express.Router();

const requireAuth = require("../middlewares/auth.middleware");
const {
  addOrUpdateSchedule,
  getMySchedule,
  deleteSession,
} = require("../controllers/Schedule.controller");

router.post("/AddOrUpdate", requireAuth, addOrUpdateSchedule);
router.get("/my-schedule", requireAuth, getMySchedule);
router.delete("/session/:sessionId", requireAuth, deleteSession);

module.exports = router;
