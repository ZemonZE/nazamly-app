// src/controllers/courseMaterials.controller.js
const CourseMaterial = require('../models/materials/courseMaterial.model');
const Course = require('../models/academic/course.model');
const driveService = require('../services/drive.service');

// Default sub-folder types with Arabic labels
const DEFAULT_SUBFOLDERS = [
  { type: 'lectures', label: 'المحاضرات' },
  { type: 'sections', label: 'السكاشن' },
  { type: 'videos', label: 'الفيديوهات' },
  { type: 'finals', label: 'الفاينالز' },
  { type: 'mids', label: 'الميدترمز' },
  { type: 'assignments', label: 'الواجبات' },
];

/**
 * POST /api/course-materials/init
 * Initialize Drive folder structure for a course.
 * Creates: Root folder → sub-folders (Lectures, Sections, etc.)
 * Body: { courseCode, courseName }
 * Idempotent — returns existing if already initialized.
 */
exports.initCourseFolders = async (req, res) => {
  try {
    const { courseCode, courseName } = req.body;
    if (!courseCode || !courseName) {
      return res.status(400).json({ error: 'courseCode and courseName are required' });
    }

    const code = courseCode.toUpperCase().trim();

    // Check if already initialized
    const existing = await CourseMaterial.findOne({ courseCode: code });
    if (existing) {
      return res.json({ message: 'Course materials already initialized', course: existing });
    }

    // Create root course folder on Drive (e.g., "Cryptography - CS402")
    const rootFolderName = `${courseName} - ${code}`;
    const rootFolder = await driveService.createFolder(rootFolderName);

    // Create sub-folders inside the root
    const subFolders = [];
    for (const sf of DEFAULT_SUBFOLDERS) {
      const driveFolder = await driveService.createFolder(sf.label, rootFolder.id);
      subFolders.push({
        type: sf.type,
        label: sf.label,
        driveFolderId: driveFolder.id,
        driveWebViewLink: driveFolder.webViewLink,
      });
    }

    // Save to DB
    const courseMaterial = await CourseMaterial.create({
      courseCode: code,
      courseName,
      driveFolderId: rootFolder.id,
      driveWebViewLink: rootFolder.webViewLink,
      subFolders,
    });

    res.status(201).json({
      message: 'Course folders initialized on Google Drive',
      course: courseMaterial,
    });
  } catch (error) {
    console.error('Error initializing course folders:', error.message);
    res.status(500).json({ error: 'Failed to initialize course folders', details: error.message });
  }
};

/**
 * GET /api/course-materials/my-courses  (STUDENT — read-only)
 * Returns ONLY courses that already have Drive folders initialized by admin.
 * Never creates folders.
 */
exports.getMyCoursesMaterials = async (req, res) => {
  try {
    const allCourses = await Course.find().sort({ courseCode: 1 });
    if (allCourses.length === 0) return res.json({ courses: [] });

    // Only return courses that have CourseMaterial docs (initialized by admin)
    const result = [];
    for (const course of allCourses) {
      const code = course.courseCode.toUpperCase().trim();
      const cm = await CourseMaterial.findOne({ courseCode: code });
      if (!cm) continue; // skip — not initialized yet

      result.push({
        _id: cm._id,
        courseCode: cm.courseCode,
        courseName: cm.courseName,
        creditHours: course.creditHours,
        level: course.level,
        driveFolderId: cm.driveFolderId,
        driveWebViewLink: cm.driveWebViewLink,
        subFolders: cm.subFolders,
        initialized: true,
      });
    }

    res.json({ courses: result });
  } catch (error) {
    console.error('Error fetching course materials:', error.message);
    res.status(500).json({ error: 'Failed to fetch course materials' });
  }
};

/**
 * GET /api/admin/course-materials  (ADMIN — auto-creates Drive folders)
 * Returns ALL courses. Auto-initializes Drive folder structure
 * for any courses that don't have them yet.
 */
exports.getCourseMaterialsAdmin = async (req, res) => {
  try {
    const allCourses = await Course.find().sort({ courseCode: 1 });
    if (allCourses.length === 0) return res.json({ courses: [] });

    const result = [];

    for (const course of allCourses) {
      const code = course.courseCode.toUpperCase().trim();
      let cm = await CourseMaterial.findOne({ courseCode: code });

      // Auto-initialize Drive folder structure if not yet created
      if (!cm) {
        try {
          const rootFolderName = `${course.courseName} - ${code}`;
          const rootFolder = await driveService.createFolder(rootFolderName);

          const subFolders = [];
          for (const sf of DEFAULT_SUBFOLDERS) {
            const driveFolder = await driveService.createFolder(sf.label, rootFolder.id);
            subFolders.push({
              type: sf.type,
              label: sf.label,
              driveFolderId: driveFolder.id,
              driveWebViewLink: driveFolder.webViewLink,
            });
          }

          cm = await CourseMaterial.create({
            courseCode: code,
            courseName: course.courseName,
            driveFolderId: rootFolder.id,
            driveWebViewLink: rootFolder.webViewLink,
            subFolders,
          });
        } catch (initErr) {
          console.warn(`Could not init Drive folders for ${code}:`, initErr.message);
          result.push({
            courseCode: code,
            courseName: course.courseName,
            creditHours: course.creditHours,
            level: course.level,
            initialized: false,
          });
          continue;
        }
      }

      result.push({
        _id: cm._id,
        courseCode: cm.courseCode,
        courseName: cm.courseName,
        creditHours: course.creditHours,
        level: course.level,
        driveFolderId: cm.driveFolderId,
        driveWebViewLink: cm.driveWebViewLink,
        subFolders: cm.subFolders,
        initialized: true,
      });
    }

    res.json({ courses: result });
  } catch (error) {
    console.error('Error fetching course materials (admin):', error.message);
    res.status(500).json({ error: 'Failed to fetch course materials' });
  }
};

/**
 * GET /api/course-materials/:courseCode/files/:subFolderType
 * List all files in a specific sub-folder of a course from Google Drive.
 */
exports.getSubFolderFiles = async (req, res) => {
  try {
    const { courseCode, subFolderType } = req.params;
    const cm = await CourseMaterial.findOne({ courseCode: courseCode.toUpperCase().trim() });
    if (!cm) return res.status(404).json({ error: 'Course materials not found' });

    const subFolder = cm.subFolders.find((sf) => sf.type === subFolderType);
    if (!subFolder) return res.status(404).json({ error: `Sub-folder "${subFolderType}" not found` });

    const files = await driveService.listFiles(subFolder.driveFolderId);
    res.json({
      courseCode: cm.courseCode,
      courseName: cm.courseName,
      subFolder: {
        type: subFolder.type,
        label: subFolder.label,
        driveWebViewLink: subFolder.driveWebViewLink,
      },
      files,
    });
  } catch (error) {
    console.error('Error listing sub-folder files:', error.message);
    res.status(500).json({ error: 'Failed to list files' });
  }
};

/**
 * POST /api/course-materials/:courseCode/upload/:subFolderType
 * Upload a file to a specific sub-folder of a course.
 * Body (multipart/form-data): file + optional title
 */
exports.uploadToSubFolder = async (req, res) => {
  try {
    const { courseCode, subFolderType } = req.params;
    const file = req.file;
    const title = req.body.title || file?.originalname;

    if (!file) return res.status(400).json({ error: 'File is required' });

    const cm = await CourseMaterial.findOne({ courseCode: courseCode.toUpperCase().trim() });
    if (!cm) return res.status(404).json({ error: 'Course materials not found' });

    const subFolder = cm.subFolders.find((sf) => sf.type === subFolderType);
    if (!subFolder) return res.status(404).json({ error: `Sub-folder "${subFolderType}" not found` });

    const driveFile = await driveService.uploadFile(
      file.buffer,
      title,
      file.mimetype,
      subFolder.driveFolderId,
    );

    res.status(201).json({
      message: 'File uploaded successfully',
      file: {
        id: driveFile.id,
        name: title,
        webViewLink: driveFile.webViewLink,
      },
    });
  } catch (error) {
    console.error('Error uploading file:', error.message);
    res.status(500).json({ error: 'Failed to upload file', details: error.message });
  }
};

/**
 * GET /api/course-materials/all
 * List all initialized courses (for admin or browsing).
 */
exports.getAllCourses = async (req, res) => {
  try {
    const courses = await CourseMaterial.find().sort({ courseName: 1 });
    res.json({ courses });
  } catch (error) {
    console.error('Error fetching all courses:', error.message);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
};

/**
 * DELETE /api/course-materials/:courseCode/files/:subFolderType/:fileId
 * Delete a file from a sub-folder on Google Drive.
 */
exports.deleteFileFromSubFolder = async (req, res) => {
  try {
    const { courseCode, subFolderType, fileId } = req.params;
    const cm = await CourseMaterial.findOne({ courseCode: courseCode.toUpperCase().trim() });
    if (!cm) return res.status(404).json({ error: 'Course materials not found' });

    const subFolder = cm.subFolders.find((sf) => sf.type === subFolderType);
    if (!subFolder) return res.status(404).json({ error: `Sub-folder "${subFolderType}" not found` });

    await driveService.deleteFile(fileId);
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error.message);
    res.status(500).json({ error: 'Failed to delete file', details: error.message });
  }
};
