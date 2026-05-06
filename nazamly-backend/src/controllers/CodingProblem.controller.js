const codingProblemRepo = require('../Repos/CodingProblem_Repo');
const studentProgressRepo = require('../Repos/StudentProgress_Repo');
const { parse, ParseError } = require('../services/TestCaseParser');

/**
 * POST /api/admin/coding/problems
 * Creates a new coding problem from multipart form data.
 */
const createProblem = async (req, res) => {
  console.log("[CodingProblem.controller] createProblem called");
  try {
    const { title, topic, courseId, estimatedMinutes, difficulty } = req.body;

    // Parse array fields (multipart sends them as strings or arrays)
    const supportedLanguages = [].concat(req.body.supportedLanguages || []);
    const tags = [].concat(req.body.tags || []);

    const descriptionMd = req.files.descriptionFile[0].buffer.toString();
    const testCasesRaw = req.files.testCasesFile[0].buffer.toString();

    let testCases;
    try {
      testCases = parse(testCasesRaw);
    } catch (err) {
      if (err instanceof ParseError) {
        return res.status(400).json({
          success: false,
          message: err.message,
          code: 'INVALID_TEST_CASE_FORMAT',
        });
      }
      throw err;
    }

    const problem = await codingProblemRepo.create({
      title,
      descriptionMd,
      testCases,
      supportedLanguages,
      topic,
      tags,
      courseId,
      estimatedMinutes,
      difficulty,
    });

    return res.status(201).json({ success: true, data: problem });
  } catch (error) {
    console.error('[createProblem] Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/admin/coding/problems/:id
 * Updates a problem and resets all solved statuses for that problem.
 */
const updateProblem = async (req, res) => {
  console.log("[CodingProblem.controller] updateProblem called");
  try {
    const problemId = req.params.id;
    const updated = await codingProblemRepo.update(problemId, req.body);
    await studentProgressRepo.resetSolvedForProblem(problemId);
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error('[updateProblem] Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/admin/coding/problems/:id
 * Soft-deletes a problem and all its submissions.
 */
const deleteProblem = async (req, res) => {
  console.log("[CodingProblem.controller] deleteProblem called");
  try {
    const problemId = req.params.id;
    await codingProblemRepo.softDeleteWithSubmissions(problemId);
    return res.status(200).json({ success: true, message: 'Problem deleted' });
  } catch (error) {
    console.error('[deleteProblem] Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/coding/problems?courseId=&sort=&dir=
 * Lists problems for a course with solved status attached per student.
 */
const listProblems = async (req, res) => {
  console.log("[CodingProblem.controller] listProblems called");
  try {
    const { courseId, sort, dir } = req.query;

    const problems = await codingProblemRepo.findByCourse(courseId, { sort, dir });
    const progress = await studentProgressRepo.findOrCreate(req.user.uid, courseId);

    // Build map: problemId string → progress entry
    const progressMap = {};
    for (const entry of progress.problems) {
      progressMap[entry.problemId.toString()] = entry;
    }

    const data = problems.map((problem) => {
      const obj = problem.toObject ? problem.toObject() : { ...problem };
      const progressEntry = progressMap[obj._id.toString()];

      // Attach solved status
      if (progressEntry?.status === 'solved') {
        obj.solvedStatus = 'solved';
        obj.isSolved = true;
      } else if (progressEntry?.status === 'attempted') {
        obj.solvedStatus = 'attempted';
        obj.isSolved = false;
      } else {
        obj.solvedStatus = 'unsolved';
        obj.isSolved = false;
      }

      // Only include difficulty if student has opted in
      if (!progressEntry?.showDifficulty) {
        delete obj.difficulty;
      }

      return obj;
    });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('[listProblems] Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/coding/problems/:id
 * Returns problem detail. Filters test cases to visible only (unless admin).
 */
const getProblem = async (req, res) => {
  console.log("[CodingProblem.controller] getProblem called");
  try {
    const problemId = req.params.id;

    const problem = await codingProblemRepo.findById(problemId);
    if (!problem) {
      return res.status(404).json({ success: false, message: 'Problem not found' });
    }

    const obj = problem.toObject ? problem.toObject() : { ...problem };

    // Filter test cases to visible only for students
    if (!req.isAdmin) {
      obj.testCases = obj.testCases.filter((tc) => tc.visible === true);
    }

    // Fetch student's progress entry for this problem
    const progress = await studentProgressRepo.findOrCreate(req.user.uid, obj.courseId.toString());
    const progressEntry = progress.problems.find(
      (p) => p.problemId.toString() === problemId.toString()
    );

    // Attach showDifficulty preference; hide difficulty if not opted in
    obj.showDifficulty = progressEntry?.showDifficulty ?? false;
    if (!obj.showDifficulty) {
      delete obj.difficulty;
    }

    return res.status(200).json({ success: true, data: obj });
  } catch (error) {
    console.error('[getProblem] Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/admin/coding/problems?courseId=&sort=&dir=
 * Admin version — returns all fields including difficulty, no student progress logic.
 */
const listProblemsAdmin = async (req, res) => {
  console.log("[CodingProblem.controller] listProblemsAdmin called");
  try {
    const { courseId, sort, dir } = req.query;
    if (!courseId) {
      return res.status(400).json({ success: false, message: 'courseId is required' });
    }
    const problems = await codingProblemRepo.findByCourse(courseId, { sort, dir });
    return res.status(200).json({ success: true, data: problems });
  } catch (error) {
    console.error('[listProblemsAdmin] Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createProblem, updateProblem, deleteProblem, listProblems, getProblem, listProblemsAdmin };
