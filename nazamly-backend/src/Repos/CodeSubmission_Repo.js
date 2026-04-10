const Base_Repo = require('./Base_Repo');
const CodeSubmission = require('../models/coding/codeSubmission.model');

class CodeSubmission_Repo extends Base_Repo {
  constructor() {
    super(CodeSubmission);
  }

  /**
   * findByStudentAndProblem - بتجيب آخر 20 submission لطالب معين على مسألة معينة
   *
   * @param {String} studentId - الـ ID بتاع الطالب
   * @param {String} studentId - الـ ID بتاع المسألة
   * @returns {Promise<Array>} array من الـ submissions مرتبة من الأحدث للأقدم
   */
  async findByStudentAndProblem(studentId, problemId) {
    return await this.model
      .find({ studentId, problemId, isDeleted: { $ne: true } })
      .sort({ createdAt: -1 })
      .limit(20);
  }

  /**
   * findByProblem - بتجيب كل الـ submissions لمسألة معينة مع Pagination
   *
   * @param {String} problemId - الـ ID بتاع المسألة
   * @param {Object} options
   * @param {Number} options.page - رقم الصفحة (default: 1)
   * @param {Number} options.limit - عدد النتائج في الصفحة (default: 20)
   * @returns {Promise<Array>} array من الـ submissions مرتبة من الأحدث للأقدم
   */
  async findByProblem(problemId, { page = 1, limit = 20 } = {}) {
    const skip = (page - 1) * limit;
    return await this.model
      .find({ problemId, isDeleted: { $ne: true } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
  }
}

module.exports = new CodeSubmission_Repo();
module.exports.CodeSubmission_Repo = CodeSubmission_Repo;
