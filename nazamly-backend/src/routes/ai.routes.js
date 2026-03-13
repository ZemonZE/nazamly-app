// src/routes/ai.routes.js
const express = require('express');
const router = express.Router();

const upload = require('../middlewares/upload.middleware');
const authMiddleware = require('../middlewares/auth.middleware'); 
const { generateScheduleFromFiles } = require('../controllers/ai.controller');

router.post('/generate', authMiddleware, upload.array('scheduleFiles', 5), generateScheduleFromFiles);

module.exports = router;