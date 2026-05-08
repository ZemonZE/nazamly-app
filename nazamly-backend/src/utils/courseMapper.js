/**
 * Course enrichment and GPA calculation utilities.
 *
 * - Normalizes Arabic course codes to Latin
 * - Enriches courses with credit hours from DB (batch lookup)
 * - Calculates term GPA using gradePoints × creditHours
 * - Determines if a transcript needs manual review
 */
const { normalizeCourseCode } = require('./normalizeCourseCode');

const DEFAULT_CREDIT_HOURS = 3;
const CONFIDENCE_REVIEW_THRESHOLD = 0.80;

/**
 * Normalize course codes and enrich with credit hours from the DB.
 *
 * Uses batch $in query for performance instead of N individual lookups.
 *
 * @param {Array}  courses  Raw courses from AI transcript extraction
 * @returns {Promise<Array>} Enriched course array
 */
async function enrichCourses(courses) {
  // Normalize all codes first
  const normalized = courses.map(c => ({
    ...c,
    courseCode: normalizeCourseCode(c.courseCode || c.rawCode || ''),
  }));

  // Batch DB lookup for credit hours using existing Course_Repo
  const Course_Repo = require('../Repos/Course_Repo');
  const codes = normalized.map(c => c.courseCode).filter(Boolean);

  // Use the repo's underlying model for a batch query
  const dbRecords = await Course_Repo.model.find({
    courseCode: { $in: codes.map(c => c.toUpperCase()) },
    isDeleted: { $ne: true }
  }).select('courseCode creditHours').lean();

  const creditMap = {};
  for (const r of dbRecords) creditMap[r.courseCode] = r.creditHours;

  return normalized.map(c => ({
    courseCode:        c.courseCode,
    rawCode:           c.rawCode || c.courseCode,
    courseName:        c.courseName || null,
    mark:              c.mark,
    gradePoints:       c.gradePoints,
    creditHours:       creditMap[c.courseCode] ?? DEFAULT_CREDIT_HOURS,
    creditHoursFromDB: Object.prototype.hasOwnProperty.call(creditMap, c.courseCode),
    semester:          c.semester,
    rating:            c.rating   || null,
    symbol:            c.symbol   || null,
    isManuallyEdited:  false,
    isRetake:          false,
  }));
}

/**
 * Calculate term GPA from enriched courses.
 * Uses gradePoints × creditHours formula.
 *
 * @param {Array} courses  Enriched course array
 * @returns {{ termGPA: number, totalCreditHours: number }}
 */
function calculateTermGPA(courses) {
  let totalWeightedPoints = 0;
  let totalCreditHours    = 0;

  for (const c of courses) {
    if (c.gradePoints != null && c.creditHours) {
      totalWeightedPoints += c.gradePoints * c.creditHours;
      totalCreditHours    += c.creditHours;
    }
  }

  const termGPA = totalCreditHours > 0
    ? parseFloat((totalWeightedPoints / totalCreditHours).toFixed(2))
    : 0;

  return { termGPA, totalCreditHours };
}

/**
 * Determine if a transcript needs manual review based on confidence score.
 * @param {number} confidence  AI extraction confidence (0.0 - 1.0)
 * @returns {boolean}
 */
function needsReview(confidence) {
  return typeof confidence === 'number' && confidence < CONFIDENCE_REVIEW_THRESHOLD;
}

// Backward-compatible alias
function calculateGPA(courses) {
  return calculateTermGPA(courses).termGPA;
}

module.exports = { enrichCourses, calculateTermGPA, calculateGPA, needsReview };
