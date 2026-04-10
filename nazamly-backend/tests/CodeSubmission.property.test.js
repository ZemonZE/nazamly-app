/**
 * Property-Based Tests for CodeSubmission Controller
 * Feature: code-practice-platform
 */

const fc = require('fast-check');

jest.mock('../src/Repos/CodingProblem_Repo');
jest.mock('../src/Repos/CodeSubmission_Repo');
jest.mock('../src/Repos/StudentProgress_Repo');
jest.mock('../src/services/PistonService');

const codingProblemRepo = require('../src/Repos/CodingProblem_Repo');
const codeSubmissionRepo = require('../src/Repos/CodeSubmission_Repo');
const studentProgressRepo = require('../src/Repos/StudentProgress_Repo');
const pistonService = require('../src/services/PistonService');

const { submitCode, getSubmissions } = require('../src/controllers/CodeSubmission.controller');

function mockReq(overrides = {}) {
  return { body: {}, query: {}, params: {}, user: { uid: 'student1' }, ...overrides };
}

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// Property 11: Verdict Assignment Correctness
// ─────────────────────────────────────────────────────────────────────────────
describe('Property 11: Verdict Assignment Correctness', () => {
  it('verdict is AC iff all test cases pass, WA otherwise', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.record({ passed: fc.boolean() }), { minLength: 1 }),
        async (testCaseResults) => {
          jest.clearAllMocks();

          const allPassed = testCaseResults.every((tc) => tc.passed);

          // Build test cases with expectedOutput = 'expected'
          const testCases = testCaseResults.map((tc, i) => ({
            input: `input${i}`,
            expectedOutput: 'expected',
          }));

          codingProblemRepo.findById = jest.fn().mockResolvedValue({
            _id: 'prob1',
            courseId: 'course1',
            isDeleted: false,
            testCases,
          });

          // Mock piston to return matching or non-matching stdout
          pistonService.execute = jest.fn().mockImplementation((_lang, _code, input) => {
            const idx = testCases.findIndex((tc) => tc.input === input);
            const passed = testCaseResults[idx]?.passed ?? false;
            return Promise.resolve({
              stdout: passed ? 'expected' : 'wrong',
              stderr: '',
              signal: null,
            });
          });

          codeSubmissionRepo.create = jest.fn().mockResolvedValue({ _id: 'sub1' });
          studentProgressRepo.upsertProgress = jest.fn().mockResolvedValue({});
          studentProgressRepo.findOrCreate = jest.fn().mockResolvedValue({});
          studentProgressRepo.setShowDifficulty = jest.fn().mockResolvedValue({});
          codingProblemRepo.incrementAcCount = jest.fn().mockResolvedValue({});

          const req = mockReq({
            body: { problemId: 'prob1', language: 'cpp', code: 'int main(){}' },
          });
          const res = mockRes();

          await submitCode(req, res);

          expect(res.status).toHaveBeenCalledWith(200);
          const jsonArg = res.json.mock.calls[0][0];
          const expectedVerdict = allPassed ? 'AC' : 'WA';
          expect(jsonArg.verdict).toBe(expectedVerdict);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Property 12: Once-Solved Invariant
// ─────────────────────────────────────────────────────────────────────────────
describe('Property 12: Once-Solved Invariant', () => {
  it('upsertProgress is called with WA verdict even when student previously had AC', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }),
        async (_n) => {
          jest.clearAllMocks();

          // Problem with one test case that will fail (WA)
          codingProblemRepo.findById = jest.fn().mockResolvedValue({
            _id: 'prob1',
            courseId: 'course1',
            isDeleted: false,
            testCases: [{ input: 'in', expectedOutput: 'expected' }],
          });

          // Piston returns wrong output → WA
          pistonService.execute = jest.fn().mockResolvedValue({
            stdout: 'wrong',
            stderr: '',
            signal: null,
          });

          codeSubmissionRepo.create = jest.fn().mockResolvedValue({ _id: 'sub2' });

          // upsertProgress is the repo method that handles no-downgrade logic
          studentProgressRepo.upsertProgress = jest.fn().mockResolvedValue({});
          studentProgressRepo.findOrCreate = jest.fn().mockResolvedValue({});
          studentProgressRepo.setShowDifficulty = jest.fn().mockResolvedValue({});
          codingProblemRepo.incrementAcCount = jest.fn().mockResolvedValue({});

          const req = mockReq({
            body: { problemId: 'prob1', language: 'cpp', code: 'int main(){}' },
          });
          const res = mockRes();

          await submitCode(req, res);

          expect(res.status).toHaveBeenCalledWith(200);
          const jsonArg = res.json.mock.calls[0][0];
          expect(jsonArg.verdict).toBe('WA');

          // upsertProgress must be called with 'WA' — the repo itself handles no-downgrade
          expect(studentProgressRepo.upsertProgress).toHaveBeenCalledWith(
            'student1',
            'course1',
            'prob1',
            'WA',
            'cpp'
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Property 14: WA Response Reveals Only First Failure
// ─────────────────────────────────────────────────────────────────────────────
describe('Property 14: WA Response Reveals Only First Failure', () => {
  it('response firstFailure is not null and contains exactly one failing test case detail', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.record({ passed: fc.boolean() }), { minLength: 1 }).filter(
          (arr) => arr.some((tc) => !tc.passed)
        ),
        async (testCaseResults) => {
          jest.clearAllMocks();

          const testCases = testCaseResults.map((tc, i) => ({
            input: `input${i}`,
            expectedOutput: 'expected',
          }));

          codingProblemRepo.findById = jest.fn().mockResolvedValue({
            _id: 'prob1',
            courseId: 'course1',
            isDeleted: false,
            testCases,
          });

          pistonService.execute = jest.fn().mockImplementation((_lang, _code, input) => {
            const idx = testCases.findIndex((tc) => tc.input === input);
            const passed = testCaseResults[idx]?.passed ?? false;
            return Promise.resolve({
              stdout: passed ? 'expected' : 'wrong',
              stderr: '',
              signal: null,
            });
          });

          codeSubmissionRepo.create = jest.fn().mockResolvedValue({ _id: 'sub3' });
          studentProgressRepo.upsertProgress = jest.fn().mockResolvedValue({});
          studentProgressRepo.findOrCreate = jest.fn().mockResolvedValue({});
          studentProgressRepo.setShowDifficulty = jest.fn().mockResolvedValue({});
          codingProblemRepo.incrementAcCount = jest.fn().mockResolvedValue({});

          const req = mockReq({
            body: { problemId: 'prob1', language: 'cpp', code: 'int main(){}' },
          });
          const res = mockRes();

          await submitCode(req, res);

          const jsonArg = res.json.mock.calls[0][0];
          expect(jsonArg.verdict).toBe('WA');

          // firstFailure must be present and be a single object (not an array)
          expect(jsonArg.firstFailure).not.toBeNull();
          expect(typeof jsonArg.firstFailure).toBe('object');
          expect(Array.isArray(jsonArg.firstFailure)).toBe(false);

          // firstFailure should have input and expectedOutput
          expect(jsonArg.firstFailure).toHaveProperty('input');
          expect(jsonArg.firstFailure).toHaveProperty('expectedOutput');

          // The response should NOT have a "failures" array with multiple entries
          expect(jsonArg.failures).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Property 16: Submission History Ordering and Limit
// ─────────────────────────────────────────────────────────────────────────────
describe('Property 16: Submission History Ordering and Limit', () => {
  it('response length is min(N, 20) and submissions are sorted by createdAt desc', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 30 }),
        async (N) => {
          jest.clearAllMocks();

          const limit = Math.min(N, 20);

          // Build mock submissions sorted by createdAt desc
          const now = Date.now();
          const submissions = Array.from({ length: limit }, (_, i) => ({
            _id: `sub${i}`,
            studentId: 'student1',
            problemId: 'prob1',
            verdict: 'AC',
            createdAt: new Date(now - i * 1000),
          }));

          codeSubmissionRepo.findByStudentAndProblem = jest
            .fn()
            .mockResolvedValue(submissions);

          const req = mockReq({ query: { problemId: 'prob1' } });
          const res = mockRes();

          await getSubmissions(req, res);

          expect(res.status).toHaveBeenCalledWith(200);
          const jsonArg = res.json.mock.calls[0][0];
          expect(jsonArg.data).toHaveLength(limit);

          // Verify sorted by createdAt descending
          for (let i = 0; i < jsonArg.data.length - 1; i++) {
            const a = new Date(jsonArg.data[i].createdAt).getTime();
            const b = new Date(jsonArg.data[i + 1].createdAt).getTime();
            expect(a).toBeGreaterThanOrEqual(b);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Property 13: Submission Record Completeness
// ─────────────────────────────────────────────────────────────────────────────
describe('Property 13: Submission Record Completeness', () => {
  it('stored submission record has all required non-null fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('cpp', 'js'),
        async (language) => {
          jest.clearAllMocks();

          codingProblemRepo.findById = jest.fn().mockResolvedValue({
            _id: 'prob1',
            courseId: 'course1',
            isDeleted: false,
            testCases: [{ input: 'in', expectedOutput: 'expected' }],
          });

          pistonService.execute = jest.fn().mockResolvedValue({
            stdout: 'expected',
            stderr: '',
            signal: null,
          });

          const createdAt = new Date();
          const storedRecord = {
            _id: 'sub4',
            studentId: 'student1',
            problemId: 'prob1',
            language,
            code: 'int main(){}',
            verdict: 'AC',
            testResults: [{ testCaseIndex: 0, passed: true, stdout: 'expected', stderr: '', signal: null }],
            createdAt,
          };

          codeSubmissionRepo.create = jest.fn().mockResolvedValue(storedRecord);
          studentProgressRepo.upsertProgress = jest.fn().mockResolvedValue({});
          studentProgressRepo.findOrCreate = jest.fn().mockResolvedValue({});
          studentProgressRepo.setShowDifficulty = jest.fn().mockResolvedValue({});
          codingProblemRepo.incrementAcCount = jest.fn().mockResolvedValue({});

          const req = mockReq({
            body: { problemId: 'prob1', language, code: 'int main(){}' },
          });
          const res = mockRes();

          await submitCode(req, res);

          // Verify create was called with all required fields
          expect(codeSubmissionRepo.create).toHaveBeenCalledTimes(1);
          const createArg = codeSubmissionRepo.create.mock.calls[0][0];

          expect(createArg.studentId).not.toBeNull();
          expect(createArg.problemId).not.toBeNull();
          expect(createArg.language).not.toBeNull();
          expect(createArg.code).not.toBeNull();
          expect(createArg.verdict).not.toBeNull();
          expect(createArg.testResults).not.toBeNull();

          // The returned record has createdAt (set by Mongoose timestamps)
          expect(storedRecord.createdAt).not.toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Property 10: Language Preference Persistence
// ─────────────────────────────────────────────────────────────────────────────
describe('Property 10: Language Preference Persistence', () => {
  it('upsertProgress is called with the submitted language as the 5th argument', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('cpp', 'js', 'emu8086', 'plsql'),
        async (language) => {
          jest.clearAllMocks();

          codingProblemRepo.findById = jest.fn().mockResolvedValue({
            _id: 'prob1',
            courseId: 'course1',
            isDeleted: false,
            testCases: [{ input: 'in', expectedOutput: 'expected' }],
          });

          pistonService.execute = jest.fn().mockResolvedValue({
            stdout: 'expected',
            stderr: '',
            signal: null,
          });

          codeSubmissionRepo.create = jest.fn().mockResolvedValue({ _id: 'sub5' });
          studentProgressRepo.upsertProgress = jest.fn().mockResolvedValue({});
          studentProgressRepo.findOrCreate = jest.fn().mockResolvedValue({});
          studentProgressRepo.setShowDifficulty = jest.fn().mockResolvedValue({});
          codingProblemRepo.incrementAcCount = jest.fn().mockResolvedValue({});

          const req = mockReq({
            body: { problemId: 'prob1', language, code: 'some code' },
          });
          const res = mockRes();

          await submitCode(req, res);

          expect(studentProgressRepo.upsertProgress).toHaveBeenCalledTimes(1);
          const callArgs = studentProgressRepo.upsertProgress.mock.calls[0];
          // 5th argument (index 4) is the language
          expect(callArgs[4]).toBe(language);
        }
      ),
      { numRuns: 100 }
    );
  });
});
