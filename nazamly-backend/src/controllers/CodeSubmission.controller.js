const Joi = require('joi');
const codingProblemRepo = require('../Repos/CodingProblem_Repo');
const codeSubmissionRepo = require('../Repos/CodeSubmission_Repo');
const studentProgressRepo = require('../Repos/StudentProgress_Repo');
const pistonService = require('../services/PistonService');
const { PistonLanguageUnavailableError } = pistonService;

const submitSchema = Joi.object({
  problemId: Joi.string().required(),
  language: Joi.string().required(),
  code: Joi.string().required(),
});

/**
 * submitCode - POST /api/coding/submissions
 * Validates input, runs all test cases through Piston, saves submission, updates progress.
 */
async function submitCode(req, res) {
  const { error, value } = submitSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, message: error.details[0].message, code: 'VALIDATION_ERROR' });
  }

  const { problemId, language, code } = value;

  const problem = await codingProblemRepo.findById(problemId);
  if (!problem || problem.isDeleted) {
    return res.status(404).json({ success: false, message: 'Problem not found.' });
  }

  const testResults = [];
  let verdict = 'AC';
  let firstFailure = null;

  try {
    for (let i = 0; i < problem.testCases.length; i++) {
      const testCase = problem.testCases[i];
      const result = await pistonService.execute(language, code, testCase.input);
      const passed = result.stdout.trim() === testCase.expectedOutput.trim();

      testResults.push({
        testCaseIndex: i,
        passed,
        stdout: result.stdout,
        stderr: result.stderr,
        signal: result.signal || null,
      });

      if (!passed && verdict === 'AC') {
        verdict = 'WA';
        // Include first failure if it's visible OR it's the first failure (always include)
        firstFailure = {
          input: testCase.input,
          expectedOutput: testCase.expectedOutput,
        };
      }
    }
  } catch (err) {
    if (err instanceof PistonLanguageUnavailableError) {
      return res.status(503).json({
        success: false,
        message: `Language '${language}' is temporarily unavailable. Please try again later or use a different language.`,
        code: 'LANGUAGE_UNAVAILABLE',
      });
    }
    return res.status(503).json({
      success: false,
      message: 'Code execution service is temporarily unavailable. Please try again.',
      code: 'JUDGE_UNAVAILABLE',
    });
  }

  const submission = await codeSubmissionRepo.create({
    studentId: req.user.uid,
    problemId,
    language,
    code,
    verdict,
    testResults,
  });

  await studentProgressRepo.upsertProgress(
    req.user.uid,
    problem.courseId.toString(),
    problemId,
    verdict,
    language
  );

  if (verdict === 'AC') {
    await codingProblemRepo.incrementAcCount(problemId);
    await studentProgressRepo.setShowDifficulty(
      req.user.uid,
      problem.courseId.toString(),
      problemId,
      false
    );
  }

  return res.status(200).json({
    success: true,
    verdict,
    submissionId: submission._id,
    firstFailure: firstFailure || null,
    testResults,
  });
}

/**
 * getSubmissions - GET /api/coding/submissions?problemId=
 * Returns last 20 submissions for the authenticated student on a problem.
 */
async function getSubmissions(req, res) {
  const { problemId } = req.query;
  const submissions = await codeSubmissionRepo.findByStudentAndProblem(req.user.uid, problemId);
  return res.status(200).json({ success: true, data: submissions });
}

/**
 * getAdminSubmissions - GET /api/admin/coding/problems/:id/submissions
 * Returns all submissions for a problem (admin view).
 */
async function getAdminSubmissions(req, res) {
  const problemId = req.params.id;
  const submissions = await codeSubmissionRepo.findByProblem(problemId);
  return res.status(200).json({ success: true, data: submissions });
}

module.exports = { submitCode, getSubmissions, getAdminSubmissions };
