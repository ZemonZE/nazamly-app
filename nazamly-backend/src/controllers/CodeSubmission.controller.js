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
    console.error('[submitCode] Execution error:', err.message, err.pistonData || '');
    return res.status(503).json({
      success: false,
      message: err.message || 'Code execution service is temporarily unavailable. Please try again.',
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
 * runCode - POST /api/coding/run
 * Runs code against visible sample test cases only. No DB save, no progress update.
 */
async function runCode(req, res) {
  const { error, value } = submitSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, message: error.details[0].message, code: 'VALIDATION_ERROR' });
  }

  const { problemId, language, code } = value;

  const problem = await codingProblemRepo.findById(problemId);
  if (!problem || problem.isDeleted) {
    return res.status(404).json({ success: false, message: 'Problem not found.' });
  }

  const sampleCases = problem.testCases.filter(tc => tc.visible);
  if (sampleCases.length === 0) {
    return res.status(200).json({ success: true, results: [], message: 'No visible sample test cases for this problem.' });
  }

  const results = [];
  try {
    for (let i = 0; i < sampleCases.length; i++) {
      const tc = sampleCases[i];
      const result = await pistonService.execute(language, code, tc.input);
      results.push({
        index: i,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        actualOutput: result.stdout,
        stderr: result.stderr,
        passed: result.stdout.trim() === tc.expectedOutput.trim(),
      });
    }
  } catch (err) {
    if (err instanceof PistonLanguageUnavailableError) {
      return res.status(503).json({ success: false, message: err.message, code: 'LANGUAGE_UNAVAILABLE' });
    }
    return res.status(503).json({ success: false, message: err.message || 'Code execution failed.', code: 'JUDGE_UNAVAILABLE' });
  }

  return res.status(200).json({ success: true, results });
}

/**
 * getSubmissions - GET /api/coding/submissions?problemId=
 */
async function getSubmissions(req, res) {
  const { problemId } = req.query;
  const submissions = await codeSubmissionRepo.findByStudentAndProblem(req.user.uid, problemId);
  return res.status(200).json({ success: true, data: submissions });
}

/**
 * getAdminSubmissions - GET /api/admin/coding/problems/:id/submissions
 */
async function getAdminSubmissions(req, res) {
  const problemId = req.params.id;
  const submissions = await codeSubmissionRepo.findByProblem(problemId);
  return res.status(200).json({ success: true, data: submissions });
}

module.exports = { submitCode, runCode, getSubmissions, getAdminSubmissions };
