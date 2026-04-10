const QuizAttempt = require('../models/quiz/quizAttempt.model');
const User = require('../models/user/user.model');
const aiService = require('../services/ai.service');

/**
 * POST /api/student/quizzes/submit
 * Submit an AI-generated quiz and store its snapshot.
 * Body: { courseId, totalQuestions, questionsSnapshot }
 */
exports.submitQuiz = async (req, res) => {
  try {
    const { courseId, totalQuestions, questionsSnapshot } = req.body;
    const firebaseUid = req.user.uid;

    if (!courseId || !totalQuestions || !questionsSnapshot || !Array.isArray(questionsSnapshot)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Resolve the Mongoose User _id from the Firebase UID
    const user = await User.findOne({ firebaseUid });
    if (!user) {
      return res.status(404).json({ error: 'User profile not found' });
    }
    const userId = user._id;

    // 1. Segregate and Initialize
    const essayBatch = [];
    questionsSnapshot.forEach((q, idx) => {
      // Determine type: if options exist, it's MCQ. If not, it's Essay.
      const isEssay = !q.options || q.options.length === 0 || q.type === 'ESSAY';

      if (isEssay) {
        // Force-reset status to prevent frontend false-negative leakage
        q.isCorrect = false; 
        q.explanation = "AI Grading in progress...";
        
        essayBatch.push({
          id: String(idx), // Map using snapshot index for strict correlation
          questionText: q.questionText,
          correctAnswer: q.correctAnswer,
          studentAnswer: q.studentAnswer || ""
        });
      } else {
        // Standard MCQ String Matching
        q.isCorrect = (q.studentAnswer === q.correctAnswer);
        q.explanation = q.isCorrect 
          ? "Correct answer." 
          : `Incorrect. The appropriate answer was: ${q.correctAnswer}`;
      }
    });

    // 2. Execute AI Grading for Essays
    if (essayBatch.length > 0) {
      try {
        console.log(`[Quiz Controller] Dispatching ${essayBatch.length} essays to AI Grader...`);
        const gradedResults = await aiService.evaluateEssayAnswers(essayBatch);
        
        gradedResults.forEach(res => {
          // Robust index lookup (AI returns questionId matching our batch.id string)
          const targetIdx = parseInt(res.questionId || res.id, 10);
          if (!isNaN(targetIdx) && questionsSnapshot[targetIdx]) {
            // Forcefully overwrite frontend booleans with AI Authority
            questionsSnapshot[targetIdx].isCorrect = (res.isCorrect === true);
            questionsSnapshot[targetIdx].explanation = res.explanation || "Graded by Nazamly AI.";
          }
        });
      } catch (aiError) {
        console.error("CRITICAL: AI Essay Grading failed during submission:", aiError.message);
        // Fallback: Inform user/admin that manual review is needed rather than showing a false negative
        essayBatch.forEach(item => {
          const idx = parseInt(item.id, 10);
          if (questionsSnapshot[idx]) {
            questionsSnapshot[idx].explanation = "AI Grading temporarily unavailable. Manual review required.";
          }
        });
      }
    }

    // 3. Defer Final Score Calculation until ALL grading (MCQ + AI) is merged
    const score = questionsSnapshot.reduce((acc, q) => q.isCorrect ? acc + 1 : acc, 0);

    const attempt = await QuizAttempt.create({
      quizType: 'AI_GENERATED',
      userId,
      courseId,
      totalQuestions,
      score,
      questionsSnapshot,
      submittedAt: new Date()
    });

    res.status(201).json({ 
      message: 'Quiz submitted successfully', 
      attempt 
    });
  } catch (error) {
    console.error('Error submitting AI quiz:', error);
    res.status(500).json({ error: 'Failed to submit quiz', details: error.message });
  }
};

/**
 * GET /api/student/quizzes/history
 * Fetch past AI quizzes for the logged-in student.
 */
exports.getQuizHistory = async (req, res) => {
  try {
    const firebaseUid = req.user.uid;

    // Resolve the Mongoose User _id from the Firebase UID
    const user = await User.findOne({ firebaseUid });
    if (!user) {
      return res.status(404).json({ error: 'User profile not found' });
    }
    const userId = user._id;

    const history = await QuizAttempt.find({ 
        userId,
        quizType: 'AI_GENERATED'
      })
      .populate('courseId', 'courseName courseCode')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ history });
  } catch (error) {
    console.error('Error fetching quiz history:', error);
    res.status(500).json({ error: 'Failed to fetch history', details: error.message });
  }
};
