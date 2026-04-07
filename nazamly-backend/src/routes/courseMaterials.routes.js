// src/routes/courseMaterials.routes.js  (STUDENT — read-only)
const express = require('express');
const router = express.Router();
const requireAuth = require('../middlewares/auth.middleware');
const ctrl = require('../controllers/courseMaterials.controller');

/**
 * @route   GET /api/course-materials/my-courses
 * @desc    Get courses with initialized Drive folders
 * @access  Private (Read-only for students)
 */
router.get('/my-courses', requireAuth, ctrl.getMyCoursesMaterials);

/**
 * @route   GET /api/course-materials/:courseCode/files/:subFolderType
 * @desc    List files in a specific sub-folder of a course
 * @access  Private
 */
router.get('/:courseCode/files/:subFolderType', requireAuth, ctrl.getSubFolderFiles);

module.exports = router;
