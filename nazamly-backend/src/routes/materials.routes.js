// src/routes/materials.routes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');

// File type validation
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg',
    'image/png',
    'image/gif',
    'text/plain'
  ];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, DOC, DOCX, PPT, PPTX, images, and text files are allowed.'), false);
  }
};

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
  fileFilter: fileFilter
});

const requireAuth = require('../middlewares/auth.middleware');
const ctrl = require('../controllers/materials.controller');

// ── Folders ──
/**
 * @route   POST /api/materials/folders
 * @desc    Create a new materials folder
 * @access  Private
 */
router.post('/folders', requireAuth, ctrl.createFolder);

/**
 * @route   GET /api/materials/folders/:courseInstanceId
 * @desc    Get all materials folders for a specific course instance
 * @access  Private
 */
router.get('/folders/:courseInstanceId', requireAuth, ctrl.getFolders);

/**
 * @route   DELETE /api/materials/folders/:folderId
 * @desc    Delete a materials folder
 * @access  Private
 */
router.delete('/folders/:folderId', requireAuth, ctrl.deleteFolder);

// ── Files ──
/**
 * @route   POST /api/materials/files
 * @desc    Upload a material file
 * @access  Private
 */
router.post('/files', requireAuth, upload.single('file'), ctrl.uploadFile);

/**
 * @route   GET /api/materials/files/:folderId
 * @desc    Get all files inside a specific folder
 * @access  Private
 */
router.get('/files/:folderId', requireAuth, ctrl.getFiles);

/**
 * @route   DELETE /api/materials/files/:fileId
 * @desc    Delete a material file
 * @access  Private
 */
router.delete('/files/:fileId', requireAuth, ctrl.deleteFile);

// ── Chapters ──
/**
 * @route   POST /api/materials/chapters
 * @desc    Create a new chapter entry
 * @access  Private
 */
router.post('/chapters', requireAuth, ctrl.createChapter);

/**
 * @route   GET /api/materials/chapters/:courseInstanceId
 * @desc    Get all chapters for a specific course instance
 * @access  Private
 */
router.get('/chapters/:courseInstanceId', requireAuth, ctrl.getChapters);

/**
 * @route   DELETE /api/materials/chapters/:chapterId
 * @desc    Delete a chapter entry
 * @access  Private
 */
router.delete('/chapters/:chapterId', requireAuth, ctrl.deleteChapter);

module.exports = router;
