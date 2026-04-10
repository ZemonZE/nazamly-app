const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const submissionRateLimiter = require('../middlewares/submissionRateLimiter');
const { listProblems, getProblem } = require('../controllers/CodingProblem.controller');
const { submitCode, getSubmissions } = require('../controllers/CodeSubmission.controller');
const { getProgress, toggleDifficulty } = require('../controllers/StudentProgress.controller');

router.use(authMiddleware);

router.get('/problems', listProblems);
router.get('/problems/:id', getProblem);
router.post('/submissions', submissionRateLimiter, submitCode);
router.get('/submissions', getSubmissions);
router.get('/progress', getProgress);
router.patch('/problems/:id/difficulty-preference', toggleDifficulty);

module.exports = router;
