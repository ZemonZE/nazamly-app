const express = require('express');
const router = express.Router();

const authMiddleware = require('../middlewares/auth.middleware');
const { validateScheduleInput } = require('../middlewares/schedule.validator');
const { checkScheduleConflicts } = require('../middlewares/conflict.middleware');

// TODO: [INTEGRATION - ABDO] Import the actual schedule controller here once it is ready.
// const scheduleController = require('../controllers/schedule.controller');

// TODO: [CLEANUP] Remove this dummy function completely after merging Abdo's code.
const dummyAddScheduleController = (req, res) => {
    res.status(201).json({
        success: true,
        message: 'Middlewares passed successfully! Ready for Abdo\'s DB code.',
        data: req.body.sessions
    });
};

// TODO: [INTEGRATION - ABDO] Replace dummyAddScheduleController with the actual controller method (e.g., scheduleController.addSchedule).
router.post('/add', 
    authMiddleware, 
    validateScheduleInput, 
    checkScheduleConflicts, 
    dummyAddScheduleController 
);

module.exports = router;