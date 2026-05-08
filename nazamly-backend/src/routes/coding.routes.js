const express = require('express');
const router = express.Router();
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const authMiddleware = require('../middlewares/auth.middleware');
const submissionRateLimiter = require('../middlewares/submissionRateLimiter');
const { listProblems, getProblem } = require('../controllers/CodingProblem.controller');
const { submitCode, runCode, getSubmissions, getHistory } = require('../controllers/CodeSubmission.controller');
const { getProgress, toggleDifficulty } = require('../controllers/StudentProgress.controller');

const runRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  keyGenerator: (req, res) => req.user?.uid || ipKeyGenerator(req, res),
  message: { success: false, message: 'Too many run requests. Please wait a moment.' },
});

router.use(authMiddleware);

router.get('/problems', listProblems);
router.get('/problems/:id', getProblem);
router.post('/submissions', submissionRateLimiter, submitCode);
router.post('/run', runRateLimiter, runCode);
router.get('/submissions', getSubmissions);
router.get('/history', getHistory);
router.get('/progress', getProgress);
router.patch('/problems/:id/difficulty-preference', toggleDifficulty);

module.exports = router;
