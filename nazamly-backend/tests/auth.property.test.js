/**
 * Property-Based Tests: Authorization and Security
 * Feature: code-practice-platform
 * Properties: 21, 22, 19, 20
 */

const fc = require('fast-check');

// ─────────────────────────────────────────────────────────────────────────────
// Mocks (declared before requires so jest.mock hoisting works)
// ─────────────────────────────────────────────────────────────────────────────
jest.mock('../src/Repos/CodeSubmission_Repo');
jest.mock('../src/Repos/CodingProblem_Repo');
jest.mock('../src/Repos/StudentProgress_Repo');
jest.mock('mongoose');

const mongoose = require('mongoose');
const codeSubmissionRepo = require('../src/Repos/CodeSubmission_Repo');
const codingProblemRepo = require('../src/Repos/CodingProblem_Repo');
const studentProgressRepo = require('../src/Repos/StudentProgress_Repo');

const { getSubmissions } = require('../src/controllers/CodeSubmission.controller');
const { updateProblem, deleteProblem } = require('../src/controllers/CodingProblem.controller');
const requireAdmin = require('../src/middlewares/admin.middleware');

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function makeMockSession() {
  return {
    startTransaction: jest.fn(),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    abortTransaction: jest.fn().mockResolvedValue(undefined),
    endSession: jest.fn(),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// Property 21: Cross-Student Submission Access Denied
// ─────────────────────────────────────────────────────────────────────────────
describe('Property 21: Cross-Student Submission Access Denied', () => {
  it('getSubmissions always queries with req.user.uid, not a spoofed query param', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }), // studentA uid (authenticated user)
        fc.string({ minLength: 1 }), // studentB uid (attacker tries to spoof)
        async (uidA, uidB) => {
          codeSubmissionRepo.findByStudentAndProblem = jest.fn().mockResolvedValue([]);

          const req = {
            user: { uid: uidA },
            query: { problemId: 'prob1', studentId: uidB },
          };
          const res = mockRes();

          await getSubmissions(req, res);

          // Must be called with uidA (from token), not uidB (from query param)
          expect(codeSubmissionRepo.findByStudentAndProblem).toHaveBeenCalledWith(uidA, 'prob1');
          expect(codeSubmissionRepo.findByStudentAndProblem).not.toHaveBeenCalledWith(uidB, 'prob1');
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Property 22: Admin Endpoint Authorization
// ─────────────────────────────────────────────────────────────────────────────
describe('Property 22: Admin Endpoint Authorization', () => {
  it('requireAdmin returns 403 when admin claim is falsy', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(false, undefined, null, 0, ''),
        async (adminClaim) => {
          const req = { user: { uid: 'user1', admin: adminClaim } };
          const res = mockRes();
          const next = jest.fn();

          await requireAdmin(req, res, next);

          expect(res.status).toHaveBeenCalledWith(403);
          expect(next).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('requireAdmin calls next() when admin claim is true', async () => {
    const req = { user: { uid: 'admin1', admin: true } };
    const res = mockRes();
    const next = jest.fn();

    await requireAdmin(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Property 19: Problem Update Resets Solved Status
// ─────────────────────────────────────────────────────────────────────────────
describe('Property 19: Problem Update Resets Solved Status', () => {
  it('updateProblem calls resetSolvedForProblem with the problemId and session', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        async (problemId) => {
          const mockSession = makeMockSession();
          mongoose.startSession = jest.fn().mockResolvedValue(mockSession);
          codingProblemRepo.update = jest.fn().mockResolvedValue({ _id: problemId });
          studentProgressRepo.resetSolvedForProblem = jest.fn().mockResolvedValue({});

          const req = { params: { id: problemId }, body: { title: 'Updated' } };
          const res = mockRes();

          await updateProblem(req, res);

          expect(studentProgressRepo.resetSolvedForProblem).toHaveBeenCalledWith(
            problemId,
            mockSession
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Property 20: Soft Delete Cascades to Submissions
// ─────────────────────────────────────────────────────────────────────────────
describe('Property 20: Soft Delete Cascades to Submissions', () => {
  it('deleteProblem calls softDeleteWithSubmissions with problemId and session', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        async (problemId) => {
          const mockSession = makeMockSession();
          mongoose.startSession = jest.fn().mockResolvedValue(mockSession);
          codingProblemRepo.softDeleteWithSubmissions = jest.fn().mockResolvedValue({});

          const req = { params: { id: problemId } };
          const res = mockRes();

          await deleteProblem(req, res);

          expect(codingProblemRepo.softDeleteWithSubmissions).toHaveBeenCalledWith(
            problemId,
            mockSession
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});
