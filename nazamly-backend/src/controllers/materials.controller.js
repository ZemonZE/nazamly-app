// src/controllers/materials.controller.js
const MaterialsFolder = require('../models/materials/materialsFolder.model');
const MaterialFile = require('../models/materials/materialFile.model');
const Chapter = require('../models/materials/chapter.model');
const driveService = require('../services/drive.service');

// ═══════════════════════════════════════════
//  FOLDERS
// ═══════════════════════════════════════════

/**
 * POST /api/materials/folders
 * Create a new materials folder for a course instance.
 * Also creates a corresponding Google Drive folder.
 * Body: { courseInstanceId, title }
 */
exports.createFolder = async (req, res) => {
  try {
    const { courseInstanceId, title } = req.body;

    if (!courseInstanceId || !title) {
      return res.status(400).json({ error: 'courseInstanceId and title are required' });
    }

    // Create folder on Google Drive
    const driveFolder = await driveService.createFolder(title);

    // Save to DB with the Drive folder ID
    const folder = await MaterialsFolder.create({
      courseInstanceId,
      title,
      driveFolderId: driveFolder.id,
    });

    res.status(201).json({
      message: 'Folder created successfully',
      folder,
      driveWebViewLink: driveFolder.webViewLink,
    });
  } catch (error) {
    console.error('Error creating folder:', error);
    res.status(500).json({ error: 'Failed to create folder' });
  }
};

/**
 * GET /api/materials/folders/:courseInstanceId
 * Get all folders for a specific course instance.
 */
exports.getFolders = async (req, res) => {
  try {
    const { courseInstanceId } = req.params;
    const folders = await MaterialsFolder.find({ courseInstanceId }).sort({ createdAt: 1 });
    res.json(folders);
  } catch (error) {
    console.error('Error fetching folders:', error);
    res.status(500).json({ error: 'Failed to fetch folders' });
  }
};

/**
 * DELETE /api/materials/folders/:folderId
 * Delete a folder and all its files from DB + Google Drive.
 */
exports.deleteFolder = async (req, res) => {
  try {
    const { folderId } = req.params;
    const folder = await MaterialsFolder.findById(folderId);
    if (!folder) return res.status(404).json({ error: 'Folder not found' });

    // Delete all files in this folder from Drive
    const files = await MaterialFile.find({ folderId });
    for (const file of files) {
      try {
        await driveService.deleteFile(file.driveFileId);
      } catch (e) {
        console.warn(`Could not delete Drive file ${file.driveFileId}:`, e.message);
      }
    }

    // Delete all files from DB
    await MaterialFile.deleteMany({ folderId });

    // Delete the Drive folder
    try {
      await driveService.deleteFile(folder.driveFolderId);
    } catch (e) {
      console.warn(`Could not delete Drive folder ${folder.driveFolderId}:`, e.message);
    }

    // Delete folder from DB
    await MaterialsFolder.findByIdAndDelete(folderId);

    res.json({ message: 'Folder and all contents deleted successfully' });
  } catch (error) {
    console.error('Error deleting folder:', error);
    res.status(500).json({ error: 'Failed to delete folder' });
  }
};

// ═══════════════════════════════════════════
//  FILES
// ═══════════════════════════════════════════

/**
 * POST /api/materials/files
 * Upload a file to a folder. Uses multer for file handling.
 * Body (multipart/form-data): folderId, title, fileType + file
 */
exports.uploadFile = async (req, res) => {
  try {
    const { folderId, title, fileType } = req.body;
    const file = req.file;

    if (!folderId || !title || !fileType || !file) {
      return res.status(400).json({ error: 'folderId, title, fileType, and file are required' });
    }

    // Find the folder to get its Drive folder ID
    const folder = await MaterialsFolder.findById(folderId);
    if (!folder) return res.status(404).json({ error: 'Folder not found' });

    // Upload to Google Drive inside that folder
    const driveFile = await driveService.uploadFile(
      file.buffer,
      file.originalname,
      file.mimetype,
      folder.driveFolderId
    );

    // Save to DB
    const materialFile = await MaterialFile.create({
      folderId,
      title,
      fileType,
      driveFileId: driveFile.id,
      driveWebViewLink: driveFile.webViewLink,
    });

    res.status(201).json({
      message: 'File uploaded successfully',
      file: materialFile,
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
};

/**
 * GET /api/materials/files/:folderId
 * Get all files in a folder. Optionally filter by fileType query param.
 * Query: ?fileType=pdf
 */
exports.getFiles = async (req, res) => {
  try {
    const { folderId } = req.params;
    const { fileType } = req.query;

    const query = { folderId };
    if (fileType) query.fileType = fileType;

    const files = await MaterialFile.find(query).sort({ createdAt: 1 });
    res.json(files);
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
};

/**
 * DELETE /api/materials/files/:fileId
 * Delete a single file from DB + Google Drive.
 */
exports.deleteFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const file = await MaterialFile.findById(fileId);
    if (!file) return res.status(404).json({ error: 'File not found' });

    // Delete from Drive
    try {
      await driveService.deleteFile(file.driveFileId);
    } catch (e) {
      console.warn(`Could not delete Drive file ${file.driveFileId}:`, e.message);
    }

    // Delete from DB
    await MaterialFile.findByIdAndDelete(fileId);

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
};

// ═══════════════════════════════════════════
//  CHAPTERS
// ═══════════════════════════════════════════

/**
 * POST /api/materials/chapters
 * Create a chapter linked to a course instance and material file.
 * Body: { courseInstanceId, materialFileId, title }
 */
exports.createChapter = async (req, res) => {
  try {
    const { courseInstanceId, materialFileId, title } = req.body;

    if (!courseInstanceId || !materialFileId || !title) {
      return res.status(400).json({ error: 'courseInstanceId, materialFileId, and title are required' });
    }

    const chapter = await Chapter.create({ courseInstanceId, materialFileId, title });
    res.status(201).json({ message: 'Chapter created successfully', chapter });
  } catch (error) {
    console.error('Error creating chapter:', error);
    res.status(500).json({ error: 'Failed to create chapter' });
  }
};

/**
 * GET /api/materials/chapters/:courseInstanceId
 * Get all chapters for a course instance, populated with material file info.
 */
exports.getChapters = async (req, res) => {
  try {
    const { courseInstanceId } = req.params;
    const chapters = await Chapter.find({ courseInstanceId })
      .populate('materialFileId')
      .sort({ createdAt: 1 });
    res.json(chapters);
  } catch (error) {
    console.error('Error fetching chapters:', error);
    res.status(500).json({ error: 'Failed to fetch chapters' });
  }
};

/**
 * DELETE /api/materials/chapters/:chapterId
 * Delete a chapter.
 */
exports.deleteChapter = async (req, res) => {
  try {
    const { chapterId } = req.params;
    const chapter = await Chapter.findByIdAndDelete(chapterId);
    if (!chapter) return res.status(404).json({ error: 'Chapter not found' });
    res.json({ message: 'Chapter deleted successfully' });
  } catch (error) {
    console.error('Error deleting chapter:', error);
    res.status(500).json({ error: 'Failed to delete chapter' });
  }
};
