const Base_Repo = require('./Base_Repo');
const TranscriptUpload = require('../models/gpa/transcriptUpload.model');

/**
 * TranscriptUpload_Repo - Repository for managing Transcript Uploads.
 * Extends Base_Repo to inherit standard operations.
 */
class TranscriptUpload_Repo extends Base_Repo {
  constructor() {
    super(TranscriptUpload);
  }

  /**
   * findByUserId - Fetches all transcript uploads associated with a specific user.
   * @param {String} userId - The MongoDB ObjectId of the user
   * @returns {Promise<Array>} List of user's transcript uploads, sorted by date descending.
   */
  async findByUserId(userId) {
    return await this.model.find({ userId, isDeleted: { $ne: true } }).sort({ createdAt: -1 });
  }

  /**
   * findUserTranscriptById - Fetches a specific transcript safely scoped to a user.
   * @param {String} id - The Transcript document ID
   * @param {String} userId - The MongoDB ObjectId of the user
   * @returns {Promise<Object|null>}
   */
  async findUserTranscriptById(id, userId) {
    return await this.model.findOne({ _id: id, userId, isDeleted: { $ne: true } });
  }

  /**
   * deleteUserTranscript - Soft deletes a specific user's transcript safely scoped.
   * @param {String} id - The Transcript document ID
   * @param {String} userId - The MongoDB ObjectId of the user
   * @returns {Promise<Object|null>}
   */
  async deleteUserTranscript(id, userId) {
    return await this.model.findOneAndUpdate(
      { _id: id, userId, isDeleted: { $ne: true } },
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    );
  }
}

module.exports = new TranscriptUpload_Repo();
