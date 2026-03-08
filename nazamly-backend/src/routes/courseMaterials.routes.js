// src/routes/courseMaterials.routes.js  (STUDENT — read-only)
const express = require('express');
const router = express.Router();
const requireAuth = require('../middlewares/auth.middleware');
const ctrl = require('../controllers/courseMaterials.controller');

// Get courses with initialized Drive folders (read-only for students)
router.get('/my-courses', requireAuth, ctrl.getMyCoursesMaterials);

// List files in a specific sub-folder of a course
router.get('/:courseCode/files/:subFolderType', requireAuth, ctrl.getSubFolderFiles);

module.exports = router;
