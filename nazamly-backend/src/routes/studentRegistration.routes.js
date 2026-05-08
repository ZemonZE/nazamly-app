const express = require('express');
const router = express.Router();

const requireAuth = require('../middlewares/auth.middleware');
const { registerStudent } = require('../controllers/student.controller');

/**
 * @route   POST /api/students/register
 * @desc    Complete authenticated user's student profile (onboarding)
 * @access  Private (requires Firebase Auth token)
 */
router.post('/register', requireAuth, registerStudent);

module.exports = router;
