const studentProgressRepo = require('../Repos/StudentProgress_Repo');
const codingProblemRepo = require('../Repos/CodingProblem_Repo');

/**
 * getProgress - بتجيب progress الطالب في كورس معين
 * GET /api/coding/progress?courseId=
 */
const getProgress = async (req, res) => {
  try {
    const { courseId } = req.query;

    if (!courseId) {
      return res.status(400).json({ success: false, message: 'courseId is required' });
    }

    const progress = await studentProgressRepo.findOrCreate(req.user.uid, courseId);

    const totalCount = await codingProblemRepo.model.countDocuments({
      courseId,
      isDeleted: { $ne: true },
    });

    const solvedCount = progress.problems.filter((p) => p.status === 'solved').length;
    const attemptedCount = progress.problems.filter((p) => p.status === 'attempted').length;

    return res.status(200).json({
      success: true,
      data: {
        solvedCount,
        attemptedCount,
        totalCount,
        problems: progress.problems,
      },
    });
  } catch (err) {
    console.error('getProgress error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * toggleDifficulty - بتحدث showDifficulty preference للطالب لمسألة معينة
 * PATCH /api/coding/problems/:id/difficulty-preference
 */
const toggleDifficulty = async (req, res) => {
  try {
    const problemId = req.params.id;
    const { showDifficulty } = req.body;

    if (typeof showDifficulty !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'showDifficulty must be a boolean',
      });
    }

    const problem = await codingProblemRepo.findById(problemId);
    if (!problem) {
      return res.status(404).json({ success: false, message: 'Problem not found' });
    }

    const courseId = problem.courseId;

    await studentProgressRepo.setShowDifficulty(req.user.uid, courseId, problemId, showDifficulty);

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('toggleDifficulty error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = { getProgress, toggleDifficulty };
