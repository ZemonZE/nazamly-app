/**
 * Feature: code-practice-platform
 *
 * Property 4: Problem List Completeness
 *
 * Property 5: Problem List Sorting
 *
 * Property 6: Solved Status Completeness
 *
 * Property 7: Difficulty Hidden by Default
 *
 * Property 9: Visible Test Cases Only in Student Response
 */

'use strict';

const fc = require('fast-check');

// Mock repos before requiring the controller
jest.mock('../src/Repos/CodingProblem_Repo');
jest.mock('../src/Repos/StudentProgress_Repo');

const codingProblemRepo = require('../src/Repos/CodingProblem_Repo');
const studentProgressRepo = require('../src/Repos/StudentProgress_Repo');
const { listProblems, getProblem } = require('../src/controllers/CodingProblem.controller');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockReq(overrides = {}) {
  return {
    query: {},
    params: {},
    body: {},
    user: { uid: 'student1' },
    isAdmin: false,
    ...overrides,
  };
}

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

/**
 * Build a minimal problem plain object that the controller can work with.
 * The controller calls `problem.toObject()` if available, so we provide it.
 */
function makeProblem(overrides = {}) {
  const base = {
    _id: { toString: () => overrides._id || 'prob1' },
    title: 'Test Problem',
    topic: 'arrays',
    courseId: { toString: () => overrides.courseId || 'courseA' },
    difficulty: 2,
    acCount: 0,
    isDeleted: false,
    testCases: [],
    updatedAt: new Date(),
    ...overrides,
  };
  base.toObject = () => ({ ...base });
  return base;
}

// ---------------------------------------------------------------------------
// Property 4: Problem List Completeness
// ---------------------------------------------------------------------------

describe('CodingProblem – Property 4: Problem List Completeness', () => {
  /**
   * For any course, the problem list response should contain exactly the set of
   * non-deleted CodingProblems for that course — no deleted problems should appear,
   * and no problems from other courses should appear.
   *
   */
  it('listProblems returns exactly the non-deleted problems for the requested course', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            isDeleted: fc.boolean(),
            courseId: fc.constantFrom('courseA', 'courseB'),
          }),
          { minLength: 1 }
        ),
        async (problemSpecs) => {
          const requestedCourse = 'courseA';

          // The repo already filters by course and isDeleted — simulate that
          const nonDeletedForCourse = problemSpecs.filter(
            (p) => !p.isDeleted && p.courseId === requestedCourse
          );

          const repoProblems = nonDeletedForCourse.map((spec, i) =>
            makeProblem({ _id: `prob_${i}`, courseId: requestedCourse, isDeleted: false })
          );

          codingProblemRepo.findByCourse.mockResolvedValue(repoProblems);
          studentProgressRepo.findOrCreate.mockResolvedValue({ problems: [] });

          const req = mockReq({ query: { courseId: requestedCourse } });
          const res = mockRes();

          await listProblems(req, res);

          expect(res.status).toHaveBeenCalledWith(200);
          const responseData = res.json.mock.calls[0][0];
          expect(responseData.success).toBe(true);

          // Response must contain exactly the non-deleted problems for the course
          expect(responseData.data).toHaveLength(nonDeletedForCourse.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 5: Problem List Sorting
// ---------------------------------------------------------------------------

describe('CodingProblem – Property 5: Problem List Sorting', () => {
  /**
   * For any sort field and direction, the controller should pass those params
   * to the repo correctly (the repo is responsible for the actual ordering).
   *
   */
  it('listProblems passes sort and dir params to the repo', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('updatedAt', 'difficulty', 'acCount'),
        fc.constantFrom('asc', 'desc'),
        async (sort, dir) => {
          codingProblemRepo.findByCourse.mockResolvedValue([]);
          studentProgressRepo.findOrCreate.mockResolvedValue({ problems: [] });

          const req = mockReq({ query: { courseId: 'courseA', sort, dir } });
          const res = mockRes();

          await listProblems(req, res);

          expect(codingProblemRepo.findByCourse).toHaveBeenCalledWith(
            'courseA',
            expect.objectContaining({ sort, dir })
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 6: Solved Status Completeness
// ---------------------------------------------------------------------------

describe('CodingProblem – Property 6: Solved Status Completeness', () => {
  /**
   * For any authenticated student and any problem list response, every problem
   * object in the response should contain a `solvedStatus` field with a value
   * of exactly 'solved', 'attempted', or 'unsolved'.
   *
   */
  it('every problem in listProblems response has a valid solvedStatus', async () => {
    const validStatuses = ['solved', 'attempted', 'unsolved'];

    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({ status: fc.constantFrom('solved', 'attempted', null) }),
          { minLength: 1 }
        ),
        async (progressEntries) => {
          // Build problems and matching progress entries
          const problems = progressEntries.map((entry, i) =>
            makeProblem({ _id: `prob_${i}`, courseId: 'courseA' })
          );

          const progressProblems = progressEntries
            .map((entry, i) => {
              if (entry.status === null) return null; // no progress entry
              return {
                problemId: { toString: () => `prob_${i}` },
                status: entry.status,
                showDifficulty: false,
              };
            })
            .filter(Boolean);

          codingProblemRepo.findByCourse.mockResolvedValue(problems);
          studentProgressRepo.findOrCreate.mockResolvedValue({ problems: progressProblems });

          const req = mockReq({ query: { courseId: 'courseA' } });
          const res = mockRes();

          await listProblems(req, res);

          const responseData = res.json.mock.calls[0][0];
          expect(responseData.success).toBe(true);

          for (const problem of responseData.data) {
            expect(validStatuses).toContain(problem.solvedStatus);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 7: Difficulty Hidden by Default
// ---------------------------------------------------------------------------

describe('CodingProblem – Property 7: Difficulty Hidden by Default', () => {
  /**
   * For any student whose showDifficulty preference is false (or unset),
   * the problem detail and list responses should not include the difficulty field.
   *
   */
  it('difficulty field is absent from list response when showDifficulty is false', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.integer({ min: 1, max: 3 }), { minLength: 1 }),
        async (difficulties) => {
          const problems = difficulties.map((diff, i) =>
            makeProblem({ _id: `prob_${i}`, courseId: 'courseA', difficulty: diff })
          );

          // Progress with showDifficulty: false for all problems
          const progressProblems = problems.map((p, i) => ({
            problemId: { toString: () => `prob_${i}` },
            status: 'attempted',
            showDifficulty: false,
          }));

          codingProblemRepo.findByCourse.mockResolvedValue(problems);
          studentProgressRepo.findOrCreate.mockResolvedValue({ problems: progressProblems });

          const req = mockReq({ query: { courseId: 'courseA' } });
          const res = mockRes();

          await listProblems(req, res);

          const responseData = res.json.mock.calls[0][0];
          expect(responseData.success).toBe(true);

          for (const problem of responseData.data) {
            expect(problem).not.toHaveProperty('difficulty');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('difficulty field is absent from detail response when showDifficulty is false', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 3 }),
        async (difficulty) => {
          const problemId = 'prob_detail_1';
          const courseId = 'courseA';

          const problem = makeProblem({
            _id: problemId,
            courseId,
            difficulty,
            testCases: [],
          });

          codingProblemRepo.findById.mockResolvedValue(problem);
          studentProgressRepo.findOrCreate.mockResolvedValue({
            problems: [
              {
                problemId: { toString: () => problemId },
                status: 'attempted',
                showDifficulty: false,
              },
            ],
          });

          const req = mockReq({ params: { id: problemId }, isAdmin: false });
          const res = mockRes();

          await getProblem(req, res);

          const responseData = res.json.mock.calls[0][0];
          expect(responseData.success).toBe(true);
          expect(responseData.data).not.toHaveProperty('difficulty');
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 9: Visible Test Cases Only in Student Response
// ---------------------------------------------------------------------------

describe('CodingProblem – Property 9: Visible Test Cases Only in Student Response', () => {
  /**
   * For any CodingProblem with any mix of visible and hidden test cases,
   * the student-facing problem detail response should contain only test cases
   * where visible: true.
   *
   */
  it('getProblem returns only visible test cases for students', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.record({ visible: fc.boolean() }), { minLength: 1 }),
        async (testCaseSpecs) => {
          const problemId = 'prob_tc_1';
          const courseId = 'courseA';

          const testCases = testCaseSpecs.map((spec, i) => ({
            _id: `tc_${i}`,
            input: `input_${i}`,
            expectedOutput: `output_${i}`,
            visible: spec.visible,
          }));

          const problem = makeProblem({ _id: problemId, courseId, testCases });

          codingProblemRepo.findById.mockResolvedValue(problem);
          studentProgressRepo.findOrCreate.mockResolvedValue({ problems: [] });

          const req = mockReq({ params: { id: problemId }, isAdmin: false });
          const res = mockRes();

          await getProblem(req, res);

          const responseData = res.json.mock.calls[0][0];
          expect(responseData.success).toBe(true);

          const returnedTestCases = responseData.data.testCases;
          const expectedVisibleCount = testCaseSpecs.filter((tc) => tc.visible).length;

          // All returned test cases must be visible
          for (const tc of returnedTestCases) {
            expect(tc.visible).toBe(true);
          }

          // Exactly the visible ones are returned
          expect(returnedTestCases).toHaveLength(expectedVisibleCount);
        }
      ),
      { numRuns: 100 }
    );
  });
});
