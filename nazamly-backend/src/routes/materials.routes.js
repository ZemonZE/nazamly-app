// src/routes/materials.routes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB max file size
});
const requireAuth = require('../middlewares/auth.middleware');
const ctrl = require('../controllers/materials.controller');

// ── Folders ──
router.post('/folders', requireAuth, ctrl.createFolder);
router.get('/folders/:courseInstanceId', requireAuth, ctrl.getFolders);
router.delete('/folders/:folderId', requireAuth, ctrl.deleteFolder);

// ── Files ──
router.post('/files', requireAuth, upload.single('file'), ctrl.uploadFile);
router.get('/files/:folderId', requireAuth, ctrl.getFiles);
router.delete('/files/:fileId', requireAuth, ctrl.deleteFile);

// ── Chapters ──
router.post('/chapters', requireAuth, ctrl.createChapter);
router.get('/chapters/:courseInstanceId', requireAuth, ctrl.getChapters);
router.delete('/chapters/:chapterId', requireAuth, ctrl.deleteChapter);

module.exports = router;
