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
        courseId: course._id,
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
    console.log("[DEBUG] subFolderType received:", subFolderType);
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

    let parsedFileType = 'other';
    if (file.mimetype.includes('pdf')) parsedFileType = 'pdf';
    else if (file.mimetype.includes('powerpoint') || file.mimetype.includes('presentation')) parsedFileType = 'slides';
    else if (file.mimetype.includes('word') || file.mimetype.includes('doc')) parsedFileType = 'doc';

    const MaterialFile = require('../models/materials/materialFile.model');
    const savedMaterial = await MaterialFile.create({
      title,
      fileType: parsedFileType,
      driveFileId: driveFile.id,
      driveWebViewLink: driveFile.webViewLink
    });

    if (['lectures', 'Lectures', 'المحاضرات'].includes(subFolderType)) {
      const lectureProcessor = require('../services/lectureProcessor.service');
      // Fire-and-forget: AI triggered and concepts will be saved linked to the real materialId!
      lectureProcessor.processLectureBackground(savedMaterial._id, driveFile.id);
    } else if (['mids', 'midterms', 'finals', 'final', 'امتحانات'].includes(subFolderType)) {
      console.log('[ExamProcessor] Triggered for:', subFolderType);
      
      // Fire-and-forget background ingestor
      (async () => {
        try {
          const Course = require('../models/academic/course.model');
          const courseDoc = await Course.findOne({ courseCode: courseCode.toUpperCase().trim() });
          if (!courseDoc) return;

          let materialFileIds = [];
          let { lectureIds } = req.body;
          
          if (!lectureIds || lectureIds.length === 0) {
             // Fallback: No explicit UI selection, find all mapped lectures for this course dynamically
             const lecturesFolder = cm.subFolders.find(sf => ['lectures', 'Lectures', 'المحاضرات'].includes(sf.type));
             if (lecturesFolder) {
                 const driveServiceBg = require('../services/drive.service');
                 const allDriveLectures = await driveServiceBg.listFiles(lecturesFolder.driveFolderId);
                 const availableDriveIds = allDriveLectures.map(f => f.id);
                 
                 const MaterialFileAgg = require('../models/materials/materialFile.model');
                 const resolvedMaterials = await MaterialFileAgg.find({ driveFileId: { $in: availableDriveIds } }).lean();
                 materialFileIds = resolvedMaterials.map(m => m._id);
             }
          } else {
             if (typeof lectureIds === 'string') {
               lectureIds = lectureIds.split(',').map(id => id.trim()).filter(Boolean);
             } else if (!Array.isArray(lectureIds)) {
               lectureIds = [lectureIds];
             }
             const MaterialFileAgg = require('../models/materials/materialFile.model');
             const resolvedMaterials = await MaterialFileAgg.find({ driveFileId: { $in: lectureIds } }).lean();
             materialFileIds = resolvedMaterials.map(m => m._id);
          }

          if (materialFileIds.length === 0) {
              console.warn(`[ExamProcessor] Aborted: No lectures found to link questions contextually for ${courseCode}.`);
              return;
          }

          const LectureConcept = require('../models/lectureConcept.model');
          const concepts = await LectureConcept.find({ materialFileId: { $in: materialFileIds } }).lean();

          const driveServiceBg = require('../services/drive.service');
          const pdfBuffer = await driveServiceBg.downloadFileBuffer(driveFile.id);

          const { parseExamAndLinkToLectures } = require('../services/ai.service');
          const examType = subFolderType.includes('final') ? 'final' : 'midterm';
          const examDetails = `This is a ${examType} exam.`;
          
          const aiQuestions = await parseExamAndLinkToLectures(pdfBuffer, examDetails, concepts);

          if (!Array.isArray(aiQuestions) || aiQuestions.length === 0) return;

          const ArchivedQuestion = require('../models/archivedQuestion.model');
          const documentsToInsert = [];

          for (const q of aiQuestions) {
              if (!q.questionText) continue;
              const bestLectureId = q.linkedLectureId || materialFileIds[0];

              if (bestLectureId) {
                   documentsToInsert.push({
                       courseId: courseDoc._id,
                       linkedLectureId: bestLectureId,
                       questionText: q.questionText,
                       options: Array.isArray(q.options) ? q.options : [],
                       correctAnswer: q.correctAnswer || "",
                       examType,
                       year: new Date().getFullYear() // Default year
                   });
              }
          }

          if (documentsToInsert.length > 0) {
              await ArchivedQuestion.insertMany(documentsToInsert);
              console.log(`[ExamProcessor] Background Success: Inserted ${documentsToInsert.length} questions for ${courseCode}.`);
          }
        } catch (bgErr) {
          console.error('[ExamProcessor] Background execution failed:', bgErr.message);
        }
      })();
    }

    res.status(201).json({
      message: 'File uploaded successfully and AI processing triggered safely.',
      file: {
        id: driveFile.id,
        materialId: savedMaterial._id,
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

/**
 * POST /api/admin/course-materials/sync-drive
 * Admin endpoint to scan Google Drive ROOT_FOLDER_ID and auto-create
 * Course/CourseMaterial database entries for any existing folders.
 */
exports.syncDriveToDatabase = async (req, res) => {
  try {
    const rootFolderId = process.env.DRIVE_ROOT_FOLDER_ID;
    if (!rootFolderId) {
      return res.status(500).json({ error: 'DRIVE_ROOT_FOLDER_ID not configured' });
    }

    // 1. Get all folders in the root drive directory
    const driveFolders = await driveService.listFolders(rootFolderId);
    if (!driveFolders || driveFolders.length === 0) {
      return res.json({ message: 'No folders found in Drive root', syncedCount: 0 });
    }

    let syncedCount = 0;
    const errors = [];

    // 2. Process each folder
    for (const folder of driveFolders) {
      try {
        // Expected format: "Machine Learning - CS401"
        const parts = folder.name.split(' - ');
        if (parts.length < 2) {
          console.warn(`Skipping folder "${folder.name}" - unable to parse course code.`);
          continue;
        }
        
        const courseName = parts[0].trim();
        const courseCode = parts[1].toUpperCase().trim();

        // Extract level from courseCode (e.g., CS301 -> 3)
        const levelMatch = courseCode.match(/\d/);
        const parsedLevel = levelMatch ? parseInt(levelMatch[0], 10) : 1;

        // 3. Check if CourseMaterial already exists
        let cm = await CourseMaterial.findOne({ courseCode });

        // 4. Check if Course exists in DB, create if not
        let course = await Course.findOne({ courseCode });
        if (!course) {
          course = await Course.create({
            courseCode,
            courseName,
            level: parsedLevel,
            creditHours: 3, // Defaulting to 3 for synced courses
            difficulty: 3, // Default
            department: 'General'
          });
        } else {
          // Update level for any existing synced courses that defaulted to 1
          if (course.level !== parsedLevel) {
            course.level = parsedLevel;
            await course.save();
          }
        }

        if (cm) continue; // CourseMaterial already exists, skip creating subfolders

        // 5. Build sub-folders array from Drive
        const subFoldersOnDrive = await driveService.listFolders(folder.id);
        const subFolders = [];

        // Map recognized subfolders, ignore others
        for (const sf of DEFAULT_SUBFOLDERS) {
          const matchedDriveSf = subFoldersOnDrive.find(dsf => dsf.name === sf.label);
          if (matchedDriveSf) {
            subFolders.push({
              type: sf.type,
              label: sf.label,
              driveFolderId: matchedDriveSf.id,
              driveWebViewLink: matchedDriveSf.webViewLink,
            });
          }
        }

        // 6. Create CourseMaterial entry
        await CourseMaterial.create({
          courseCode: course.courseCode,
          courseName: course.courseName,
          driveFolderId: folder.id,
          driveWebViewLink: folder.webViewLink,
          subFolders,
        });

        syncedCount++;

      } catch (err) {
        console.error(`Failed to sync folder ${folder.name}:`, err.message);
        errors.push({ folder: folder.name, error: err.message });
      }
    }

    res.json({
      message: `Sync complete. Processing finished.`,
      syncedCount,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Error syncing drive to database:', error.message);
    res.status(500).json({ error: 'Failed to sync drive to database' });
  }
};
