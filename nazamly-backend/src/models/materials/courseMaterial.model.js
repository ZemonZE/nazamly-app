const mongoose = require('mongoose');

/**
 * CourseMaterial Schema
 * Maps a course to its Google Drive folder structure.
 * Each course gets a root folder with predefined sub-folders.
 */
const subFolderSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['lectures', 'sections', 'videos', 'finals', 'mids', 'assignments', 'other'],
    required: true,
  },
  label: { type: String, required: true },           // Arabic display label
  driveFolderId: { type: String, required: true },
  driveWebViewLink: { type: String },
}, { _id: true });

const courseMaterialSchema = new mongoose.Schema({
  courseCode: { type: String, required: true, uppercase: true, trim: true, unique: true },
  courseName: { type: String, required: true, trim: true },
  driveFolderId: { type: String, required: true },      // Root course folder on Drive
  driveWebViewLink: { type: String },
  subFolders: [subFolderSchema],
}, { timestamps: true });

module.exports = mongoose.model('CourseMaterial', courseMaterialSchema);
