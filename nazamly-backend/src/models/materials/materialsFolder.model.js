const mongoose = require('mongoose');

/**
 * MaterialsFolder Schema
 * Represents a categorized container for materials within a specific CourseInstance.
 */
const materialsFolderSchema = new mongoose.Schema({
  courseInstanceId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'CourseInstance', 
    required: true, 
    index: true 
  },
  title: { type: String, required: true, trim: true },
  driveFolderId: { type: String, required: true, unique: true } // Maps to Google Drive
}, { timestamps: true });

module.exports = mongoose.model('MaterialsFolder', materialsFolderSchema);