const express = require("express");
const router = express.Router();
const requireAuth = require("../middlewares/auth.middleware");
const {
  addOrUpdateSchedule,
  getMySchedule,
  deleteSession,
} = require("../controllers/Schedule.controller");

router.use(requireAuth);

router.post("/AddOrUpdate", addOrUpdateSchedule);
router.get("/my-schedule", getMySchedule);
router.delete("/session/:sessionId", deleteSession);

module.exports = router;
