// src/routes/gpa.routes.js
const express = require('express');
const router = express.Router();

// 1. Import Middlewares
// IMPORTANT: Adjust the path to your actual authentication middleware
const authMiddleware = require('../middlewares/auth.middleware');
const { 
    validateTermCalculation, 
    validateTargetStrategy 
} = require('../middlewares/gpa.validator');

// 2. Import Controllers
const { 
    calculateCurrentTerm, 
    generateTargetPlan 
} = require('../controllers/gpa.controller');

// 3. Apply authentication to all routes in this file
// This guarantees that 'req.user' will be available in our controllers
router.use(authMiddleware);

/**
 * @route   POST /api/gpa/calculate
 * @desc    Calculates the term GPA and the new expected CGPA
 * @access  Private
 */
router.post(
    '/calculate', 
    validateTermCalculation, 
    calculateCurrentTerm
);

/**
 * @route   POST /api/gpa/target-strategy
 * @desc    Generates a smart study plan to reach a specific target CGPA
 * @access  Private
 */
router.post(
    '/target-strategy', 
    validateTargetStrategy, 
    generateTargetPlan
);

module.exports = router;