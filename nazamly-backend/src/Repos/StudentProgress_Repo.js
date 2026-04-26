const Base_Repo = require('./Base_Repo');
const StudentProgress = require('../models/coding/studentProgress.model');

class StudentProgress_Repo extends Base_Repo {
  constructor() {
    super(StudentProgress);
  }

  /**
   * findOrCreate - بتجيب أو تنشئ progress record للطالب في الكورس
   * لو مش موجود بيعمل upsert بـ problems array فاضية
   */
  async findOrCreate(studentId, courseId) {
    return await this.model.findOneAndUpdate(
      { studentId, courseId },
      { $setOnInsert: { studentId, courseId, problems: [] } },
      { upsert: true, returnDocument: 'after' }
    );
  }

  /**
   * upsertProgress - بتحدث أو تضيف progress entry للمسألة
   * - AC: دايماً بتحدث status لـ 'solved'
   * - WA: بتحدث status لـ 'attempted' بس لو مش 'solved' (مش بتنزّل)
   */
  async upsertProgress(studentId, courseId, problemId, verdict, language) {
    const progress = await this.findOrCreate(studentId, courseId);
    const existingEntry = progress.problems.find(
      (p) => p.problemId.toString() === problemId.toString()
    );

    if (existingEntry) {
      const updateFields = { 'problems.$[elem].lastLanguage': language };
      if (verdict === 'AC') {
        updateFields['problems.$[elem].status'] = 'solved';
        updateFields['problems.$[elem].solvedAt'] = new Date();
        updateFields['problems.$[elem].showDifficulty'] = false;
      } else if (verdict === 'WA' && existingEntry.status !== 'solved') {
        updateFields['problems.$[elem].status'] = 'attempted';
      }
      return await this.model.findOneAndUpdate(
        { studentId, courseId },
        { $set: updateFields },
        { arrayFilters: [{ 'elem.problemId': problemId }], returnDocument: 'after' }
      );
    } else {
      const newEntry = {
        problemId,
        status: verdict === 'AC' ? 'solved' : 'attempted',
        solvedAt: verdict === 'AC' ? new Date() : null,
        lastLanguage: language,
        showDifficulty: false,
      };
      return await this.model.findOneAndUpdate(
        { studentId, courseId },
        { $push: { problems: newEntry } },
        { returnDocument: 'after' }
      );
    }
  }

  /**
   * resetSolvedForProblem - بتعمل reset لكل الـ solved entries لمسألة معينة
   * بتحولهم لـ 'attempted' وبتشيل solvedAt
   * بتدعم Transactions عن طريق الـ session parameter
   */
  async resetSolvedForProblem(problemId) {
    return await this.model.updateMany(
      { 'problems.problemId': problemId, 'problems.status': 'solved' },
      { $set: { 'problems.$[elem].status': 'attempted', 'problems.$[elem].solvedAt': null } },
      { arrayFilters: [{ 'elem.problemId': problemId, 'elem.status': 'solved' }] }
    );
  }

  /**
   * setShowDifficulty - بتحدث showDifficulty flag لمسألة معينة للطالب
   * لو المسألة مش موجودة في الـ problems array بتضيفها أولاً
   */
  async setShowDifficulty(studentId, courseId, problemId, value) {
    // Try to update existing entry first
    const result = await this.model.findOneAndUpdate(
      { studentId, courseId, 'problems.problemId': problemId },
      { $set: { 'problems.$[elem].showDifficulty': value } },
      { arrayFilters: [{ 'elem.problemId': problemId }], returnDocument: 'after' }
    );

    // If no entry existed for this problem, push a new one
    if (!result) {
      await this.model.findOneAndUpdate(
        { studentId, courseId },
        {
          $setOnInsert: { studentId, courseId },
          $push: { problems: { problemId, status: 'attempted', showDifficulty: value } },
        },
        { upsert: true, returnDocument: 'after' }
      );
    }

    return result;
  }
}

const studentProgressRepo = new StudentProgress_Repo();

module.exports = studentProgressRepo;
module.exports.StudentProgress_Repo = StudentProgress_Repo;
