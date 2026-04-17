const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/auth.middleware");
const { getAllCourses } = require("../controllers/course.controller");

/**
 * @route   GET /api/course/
 * @desc    Get all available courses
 * @access  Private
 */
router.get("/", authMiddleware, getAllCourses);

module.exports = router;
