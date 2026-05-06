const express = require('express');
const router = express.Router();

const { registerStudent } = require('../controllers/student.controller');

/**
 * @route   POST /api/students/register
 * @desc    Register a new student profile (used by Schedule Generator)
 * @access  Public
 */
router.post('/register', registerStudent);

module.exports = router;
