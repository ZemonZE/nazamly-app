/**
 * Property-Based Tests for StudentProgress Controller
 * Feature: code-practice-platform
 */

const fc = require('fast-check');

jest.mock('../src/Repos/StudentProgress_Repo');
jest.mock('../src/Repos/CodingProblem_Repo');

const studentProgressRepo = require('../src/Repos/StudentProgress_Repo');
const codingProblemRepo = require('../src/Repos/CodingProblem_Repo');

const { getProgress, toggleDifficulty } = require('../src/controllers/StudentProgress.controller');

function mockReq(overrides = {}) {
  return { query: {}, params: {}, body: {}, user: { uid: 'student1' }, ...overrides };
}
function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
  // Set up codingProblemRepo.model as a mock object
  codingProblemRepo.model = { countDocuments: jest.fn() };
});

// ─────────────────────────────────────────────────────────────────────────────
// Property 17: Progress Counts Accuracy
// ─────────────────────────────────────────────────────────────────────────────
describe('Property 17: Progress Counts Accuracy', () => {
  it('solvedCount and attemptedCount match actual statuses, and their sum <= totalCount', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.constantFrom('solved', 'attempted'), { minLength: 0, maxLength: 20 }),
        fc.integer({ min: 0, max: 30 }),
        async (statuses, extraCount) => {
          jest.clearAllMocks();
          codingProblemRepo.model = { countDocuments: jest.fn() };

          // totalCount must be >= statuses.length
          const totalCount = statuses.length + extraCount;

          studentProgressRepo.findOrCreate = jest.fn().mockResolvedValue({
            problems: statuses.map((s, i) => ({ problemId: `p${i}`, status: s })),
          });

          codingProblemRepo.model.countDocuments = jest.fn().mockResolvedValue(totalCount);

          const req = mockReq({ query: { courseId: 'course1' } });
          const res = mockRes();

          await getProgress(req, res);

          expect(res.status).toHaveBeenCalledWith(200);
          const jsonArg = res.json.mock.calls[0][0];
          const { solvedCount, attemptedCount } = jsonArg.data;

          const expectedSolved = statuses.filter((s) => s === 'solved').length;
          const expectedAttempted = statuses.filter((s) => s === 'attempted').length;

          expect(solvedCount).toBe(expectedSolved);
          expect(attemptedCount).toBe(expectedAttempted);
          expect(solvedCount + attemptedCount).toBeLessThanOrEqual(totalCount);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Property 18: StudentProgress Uniqueness
// ─────────────────────────────────────────────────────────────────────────────
describe('Property 18: StudentProgress Uniqueness', () => {
  it('findOrCreate is called N times and always returns the same record (upsert semantics)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 10 }),
        async (N) => {
          jest.clearAllMocks();
          codingProblemRepo.model = { countDocuments: jest.fn() };

          // The single canonical record for this student+course
          const canonicalRecord = {
            studentId: 'student1',
            courseId: 'course1',
            problems: [],
          };

          // findOrCreate always returns the same record (simulating unique constraint / upsert)
          studentProgressRepo.findOrCreate = jest.fn().mockResolvedValue(canonicalRecord);
          codingProblemRepo.model.countDocuments = jest.fn().mockResolvedValue(0);

          // Simulate N concurrent calls to getProgress (each calls findOrCreate once)
          const requests = Array.from({ length: N }, () => {
            const req = mockReq({ query: { courseId: 'course1' } });
            const res = mockRes();
            return getProgress(req, res).then(() => res);
          });

          const responses = await Promise.all(requests);

          // findOrCreate must have been called exactly N times
          expect(studentProgressRepo.findOrCreate).toHaveBeenCalledTimes(N);

          // All calls used the same student+course
          for (const call of studentProgressRepo.findOrCreate.mock.calls) {
            expect(call[0]).toBe('student1');
            expect(call[1]).toBe('course1');
          }

          // All responses returned the same record (same problems array)
          for (const res of responses) {
            const jsonArg = res.json.mock.calls[0][0];
            expect(jsonArg.data.problems).toEqual(canonicalRecord.problems);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Property 8: Show Difficulty Toggle
// ─────────────────────────────────────────────────────────────────────────────
describe('Property 8: Show Difficulty Toggle', () => {
  it('setShowDifficulty is called with the correct boolean value', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.boolean(),
        async (showDifficulty) => {
          jest.clearAllMocks();
          codingProblemRepo.model = { countDocuments: jest.fn() };

          codingProblemRepo.findById = jest.fn().mockResolvedValue({
            _id: 'prob1',
            courseId: 'course1',
          });

          studentProgressRepo.setShowDifficulty = jest.fn().mockResolvedValue({
            problems: [{ problemId: 'prob1', showDifficulty }],
          });

          const req = mockReq({
            params: { id: 'prob1' },
            body: { showDifficulty },
          });
          const res = mockRes();

          await toggleDifficulty(req, res);

          expect(res.status).toHaveBeenCalledWith(200);
          expect(studentProgressRepo.setShowDifficulty).toHaveBeenCalledTimes(1);

          const callArgs = studentProgressRepo.setShowDifficulty.mock.calls[0];
          // setShowDifficulty(studentId, courseId, problemId, value)
          expect(callArgs[0]).toBe('student1');
          expect(callArgs[1]).toBe('course1');
          expect(callArgs[2]).toBe('prob1');
          expect(callArgs[3]).toBe(showDifficulty);
        }
      ),
      { numRuns: 100 }
    );
  });
});
