const Base_Repo = require('./Base_Repo');
const CodingProblem = require('../models/coding/codingProblem.model');
const CodeSubmission = require('../models/coding/codeSubmission.model');

class CodingProblem_Repo extends Base_Repo {
  constructor() {
    super(CodingProblem);
  }

  /**
   * findByCourse - بتجيب كل المسائل الخاصة بـ course معين
   * بتتجاهل الممسوح (isDeleted) وبتدعم dynamic sort
   *
   * @param {String} courseId - الـ ID بتاع الـ course
   * @param {Object} options
   * @param {String} options.sort - الحقل اللي هيتعمل عليه sort (default: 'updatedAt')
   * @param {String} options.dir - اتجاه الـ sort: 'asc' أو 'desc' (default: 'desc')
   * @returns {Promise<Array>} array من الـ documents
   */
  async findByCourse(courseId, { sort = 'updatedAt', dir = 'desc' } = {}) {
    const sortObj = { [sort]: dir === 'asc' ? 1 : -1 };
    return await this.model.find(
      { courseId, isDeleted: { $ne: true } }
    ).sort(sortObj);
  }

  /**
   * softDeleteWithSubmissions - بتعمل soft delete للمسألة وكل الـ submissions الخاصة بيها
   * بتشتغل داخل transaction session عشان تضمن consistency
   *
   * @param {String} problemId - الـ ID بتاع المسألة
   * @param {Object} session - الـ Mongoose session للـ transaction
   * @returns {Promise<Object>} الـ problem بعد الـ soft delete
   */
  async softDeleteWithSubmissions(problemId) {
    const now = new Date();
    const problem = await this.model.findByIdAndUpdate(
      problemId,
      { isDeleted: true, deletedAt: now }
    );
    await CodeSubmission.updateMany(
      { problemId },
      { isDeleted: true, deletedAt: now }
    );
    return problem;
  }

  /**
   * incrementAcCount - بتزود عداد الـ Accepted submissions للمسألة بـ 1
   *
   * @param {String} problemId - الـ ID بتاع المسألة
   * @returns {Promise<Object>} الـ problem بعد التحديث
   */
  async incrementAcCount(problemId) {
    return await this.model.findByIdAndUpdate(
      problemId,
      { $inc: { acCount: 1 } },
      { returnDocument: 'after' }
    );
  }
}

module.exports = new CodingProblem_Repo();
module.exports.CodingProblem_Repo = CodingProblem_Repo;
