const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/auth.middleware");
const { getAllCourses } = require("../controllers/course.controller");

router.get("/", authMiddleware, getAllCourses);

module.exports = router;
