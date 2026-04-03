// src/routes/admin.routes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});

const authMiddleware = require('../middlewares/auth.middleware');
const requireAdmin = require('../middlewares/admin.middleware');
const adminCtrl = require('../controllers/admin.controller');
const materialsCtrl = require('../controllers/materials.controller');
const courseMaterialsCtrl = require('../controllers/courseMaterials.controller');

// Apply authentication and admin authorization to all routes
router.use(authMiddleware);
router.use(requireAdmin);

// ── Courses ──
router.get('/courses', adminCtrl.getCourses);
router.post('/courses', adminCtrl.createCourse);
router.put('/courses/:id', adminCtrl.updateCourse);
router.delete('/courses/:id', adminCtrl.deleteCourse);

// ── Doctors ──
router.get('/doctors', adminCtrl.getDoctors);
router.post('/doctors', adminCtrl.createDoctor);
router.delete('/doctors/:id', adminCtrl.deleteDoctor);

// ── Course Instances ──
router.get('/course-instances', adminCtrl.getCourseInstances);
router.post('/course-instances', adminCtrl.createCourseInstance);
router.put('/course-instances/:id', adminCtrl.updateCourseInstance);
router.delete('/course-instances/:id', adminCtrl.deleteCourseInstance);

// ── Materials Folders ──
router.post('/materials/folders', materialsCtrl.createFolder);
router.get('/materials/folders/:courseInstanceId', materialsCtrl.getFolders);
router.delete('/materials/folders/:folderId', materialsCtrl.deleteFolder);

// ── Materials Files ──
router.post('/materials/files', upload.single('file'), materialsCtrl.uploadFile);
router.get('/materials/files/:folderId', materialsCtrl.getFiles);
router.delete('/materials/files/:fileId', materialsCtrl.deleteFile);

// ── Course Materials (Drive folder per course) ──
router.get('/course-materials', courseMaterialsCtrl.getCourseMaterialsAdmin);
router.post('/course-materials/init', courseMaterialsCtrl.initCourseFolders);
router.post('/course-materials/sync-drive', courseMaterialsCtrl.syncDriveToDatabase);
router.get('/course-materials/:courseCode/files/:subFolderType', courseMaterialsCtrl.getSubFolderFiles);
router.post('/course-materials/:courseCode/upload/:subFolderType', upload.single('file'), courseMaterialsCtrl.uploadToSubFolder);
router.delete('/course-materials/:courseCode/files/:subFolderType/:fileId', courseMaterialsCtrl.deleteFileFromSubFolder);

// ── Users ──
router.get('/users', adminCtrl.getUsers);
router.put('/users/:id', adminCtrl.updateUser);
router.patch('/users/:id/status', adminCtrl.updateUserStatus);

module.exports = router;
