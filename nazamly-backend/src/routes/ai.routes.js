// src/routes/ai.routes.js
const express = require('express');
const router = express.Router();

const upload = require('../middlewares/upload.middleware');
// Commented out for testing purposes
// const authMiddleware = require('../middlewares/auth.middleware'); 
const { generateScheduleFromFiles } = require('../controllers/ai.controller');

router.post('/generate', upload.array('scheduleFiles', 5), generateScheduleFromFiles);

module.exports = router;