const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const quizController = require('../controllers/quiz.controller');

// Require authentication for all student routes
router.use(authMiddleware);

// Quizzes
router.post('/quizzes/submit', quizController.submitQuiz);
router.get('/quizzes/history', quizController.getQuizHistory);

module.exports = router;
