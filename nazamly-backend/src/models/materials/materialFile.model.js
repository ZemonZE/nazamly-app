const mongoose = require('mongoose');

/**
 * MaterialFile Schema
 * Represents the actual file node. Linked to a specific folder.
 */
const materialFileSchema = new mongoose.Schema({
  folderId: { type: mongoose.Schema.Types.ObjectId, ref: 'MaterialsFolder', required: false, index: true },
  title: { type: String, required: true, trim: true },
  
  fileType: { 
    type: String, 
    enum: ['pdf', 'slides', 'doc', 'link', 'other'], 
    required: true,
    index: true // Indexed to allow quick filtering by file type (e.g., "Show all PDFs")
  },
  
  driveFileId: { type: String, required: true, unique: true }, // Maps to Google Drive file
  driveWebViewLink: { type: String }, // Optional direct viewing link
  
  // // Identifies the contributor. Nullable in case of automated system uploads.
  // uploadedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('MaterialFile', materialFileSchema);