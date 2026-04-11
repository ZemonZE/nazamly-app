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
/**
 * @route   GET /api/admin/courses
 * @desc    Get all courses
 * @access  Private/Admin
 */
router.get('/courses', adminCtrl.getCourses);

/**
 * @route   POST /api/admin/courses
 * @desc    Create a new course
 * @access  Private/Admin
 */
router.post('/courses', adminCtrl.createCourse);

/**
 * @route   PUT /api/admin/courses/:id
 * @desc    Update an existing course
 * @access  Private/Admin
 */
router.put('/courses/:id', adminCtrl.updateCourse);

/**
 * @route   DELETE /api/admin/courses/:id
 * @desc    Delete a course
 * @access  Private/Admin
 */
router.delete('/courses/:id', adminCtrl.deleteCourse);

// ── Doctors ──
/**
 * @route   GET /api/admin/doctors
 * @desc    Get all doctors
 * @access  Private/Admin
 */
router.get('/doctors', adminCtrl.getDoctors);

/**
 * @route   POST /api/admin/doctors
 * @desc    Create a new doctor profile
 * @access  Private/Admin
 */
router.post('/doctors', adminCtrl.createDoctor);

/**
 * @route   DELETE /api/admin/doctors/:id
 * @desc    Delete a doctor profile
 * @access  Private/Admin
 */
router.delete('/doctors/:id', adminCtrl.deleteDoctor);

// ── Course Instances ──
/**
 * @route   GET /api/admin/course-instances
 * @desc    Get course instances for a semester
 * @access  Private/Admin
 */
router.get('/course-instances', adminCtrl.getCourseInstances);

/**
 * @route   POST /api/admin/course-instances
 * @desc    Create a new course instance
 * @access  Private/Admin
 */
router.post('/course-instances', adminCtrl.createCourseInstance);

/**
 * @route   PUT /api/admin/course-instances/:id
 * @desc    Update a course instance
 * @access  Private/Admin
 */
router.put('/course-instances/:id', adminCtrl.updateCourseInstance);

/**
 * @route   DELETE /api/admin/course-instances/:id
 * @desc    Delete a course instance
 * @access  Private/Admin
 */
router.delete('/course-instances/:id', adminCtrl.deleteCourseInstance);

// ── Materials Folders ──
/**
 * @route   POST /api/admin/materials/folders
 * @desc    Create a new materials folder
 * @access  Private/Admin
 */
router.post('/materials/folders', materialsCtrl.createFolder);

/**
 * @route   GET /api/admin/materials/folders/:courseInstanceId
 * @desc    Get folders for a specific course instance
 * @access  Private/Admin
 */
router.get('/materials/folders/:courseInstanceId', materialsCtrl.getFolders);

/**
 * @route   DELETE /api/admin/materials/folders/:folderId
 * @desc    Delete a materials folder
 * @access  Private/Admin
 */
router.delete('/materials/folders/:folderId', materialsCtrl.deleteFolder);

// ── Materials Files ──
/**
 * @route   POST /api/admin/materials/files
 * @desc    Upload a material file
 * @access  Private/Admin
 */
router.post('/materials/files', upload.single('file'), materialsCtrl.uploadFile);

/**
 * @route   GET /api/admin/materials/files/:folderId
 * @desc    Get files inside a specific folder
 * @access  Private/Admin
 */
router.get('/materials/files/:folderId', materialsCtrl.getFiles);

/**
 * @route   DELETE /api/admin/materials/files/:fileId
 * @desc    Delete a material file
 * @access  Private/Admin
 */
router.delete('/materials/files/:fileId', materialsCtrl.deleteFile);

// ── Course Materials (Drive folder per course) ──
/**
 * @route   GET /api/admin/course-materials
 * @desc    Get all course materials overviews
 * @access  Private/Admin
 */
router.get('/course-materials', courseMaterialsCtrl.getCourseMaterialsAdmin);

/**
 * @route   POST /api/admin/course-materials/init
 * @desc    Initialize folders on Drive for a course
 * @access  Private/Admin
 */
router.post('/course-materials/init', courseMaterialsCtrl.initCourseFolders);

/**
 * @route   POST /api/admin/course-materials/sync-drive
 * @desc    Sync materials directly from Drive
 * @access  Private/Admin
 */
router.post('/course-materials/sync-drive', courseMaterialsCtrl.syncDriveToDatabase);

/**
 * @route   GET /api/admin/course-materials/:courseCode/files/:subFolderType
 * @desc    Get files in a course subfolder
 * @access  Private/Admin
 */
router.get('/course-materials/:courseCode/files/:subFolderType', courseMaterialsCtrl.getSubFolderFiles);

/**
 * @route   POST /api/admin/course-materials/:courseCode/upload/:subFolderType
 * @desc    Upload a file to a specific course subfolder
 * @access  Private/Admin
 */
router.post('/course-materials/:courseCode/upload/:subFolderType', upload.single('file'), courseMaterialsCtrl.uploadToSubFolder);

/**
 * @route   DELETE /api/admin/course-materials/:courseCode/files/:subFolderType/:fileId
 * @desc    Delete a file from a course subfolder
 * @access  Private/Admin
 */
router.delete('/course-materials/:courseCode/files/:subFolderType/:fileId', courseMaterialsCtrl.deleteFileFromSubFolder);
router.post('/materials/reprocess/:courseCode/:subFolderType/:fileId', courseMaterialsCtrl.reprocessFile);

// ── Users ──
/**
 * @route   GET /api/admin/users
 * @desc    Get all users list
 * @access  Private/Admin
 */
router.get('/users', adminCtrl.getUsers);

/**
 * @route   PUT /api/admin/users/:id
 * @desc    Update a user profile
 * @access  Private/Admin
 */
router.put('/users/:id', adminCtrl.updateUser);

/**
 * @route   PATCH /api/admin/users/:id/status
 * @desc    Update a user's status flag
 * @access  Private/Admin
 */
router.patch('/users/:id/status', adminCtrl.updateUserStatus);

// ── Past Exams Ingestion ──
router.post('/upload-past-exam', upload.single('pdf'), adminCtrl.uploadPastExam);

// ── Doctor ↔ Course Linkage & Profiling ──
// Use these endpoints to wire doctors to courses and back-fill DoctorInsight records.
// Step 1: Link a doctor to a course (creates a CourseInstance)
router.post('/link-doctor-to-course', adminCtrl.linkDoctorToCourse);
// Step 2: Trigger professor-style profiling using existing archived questions
router.post('/trigger-profiling/:courseId', adminCtrl.triggerProfiling);

// ── AI Configuration ──
router.get('/ai/settings', adminCtrl.getAiSettings);
router.post('/ai/settings', adminCtrl.updateAiSettings);

module.exports = router;
