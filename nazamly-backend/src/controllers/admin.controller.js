// src/controllers/admin.controller.js
const CourseInstance = require('../models/academic/courseInstance.model');
const Course = require('../models/academic/course.model');
const Doctor = require('../models/academic/doctor.model');
const User = require('../models/user/user.model');
const SystemSetting = require('../models/settings/SystemSetting.model');
const admin = require('../config/firebase');
const aiService = require('../services/ai.service');

// ═══════════════════════════════════════════
//  COURSES
// ═══════════════════════════════════════════

/** GET /api/admin/courses */
exports.getCourses = async (req, res) => {
  try {
    const courses = await Course.find().sort({ courseCode: 1 });
    res.json(courses);
  } catch (error) {
    console.error('Error fetching courses:', error.message);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
};

/** POST /api/admin/courses */
exports.createCourse = async (req, res) => {
  try {
    const { courseCode, courseName, level, creditHours, difficulty, department } = req.body;
    if (!courseCode || !courseName || !level || creditHours == null) {
      return res.status(400).json({ error: 'courseCode, courseName, level, and creditHours are required' });
    }
    const course = await Course.create({ courseCode, courseName, level, creditHours, difficulty, department });
    res.status(201).json(course);
  } catch (error) {
    console.error('Error creating course:', error.message);
    if (error.code === 11000) return res.status(409).json({ error: 'Course code already exists' });
    res.status(500).json({ error: 'Failed to create course', details: error.message });
  }
};

/** PUT /api/admin/courses/:id */
exports.updateCourse = async (req, res) => {
  try {
    const { courseCode, courseName, level, creditHours, difficulty, department } = req.body;
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      { courseCode, courseName, level, creditHours, difficulty, department },
      { returnDocument: 'after', runValidators: true }
    );
    if (!course) return res.status(404).json({ error: 'Course not found' });
    res.json(course);
  } catch (error) {
    console.error('Error updating course:', error.message);
    res.status(500).json({ error: 'Failed to update course', details: error.message });
  }
};

/** DELETE /api/admin/courses/:id */
exports.deleteCourse = async (req, res) => {
  try {
    // Check if any course instances reference this course
    const instances = await CourseInstance.countDocuments({ courseId: req.params.id });
    if (instances > 0) {
      return res.status(400).json({ error: `Cannot delete: ${instances} course instance(s) reference this course` });
    }
    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) return res.status(404).json({ error: 'Course not found' });
    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Error deleting course:', error.message);
    res.status(500).json({ error: 'Failed to delete course' });
  }
};

// ═══════════════════════════════════════════
//  DOCTORS
// ═══════════════════════════════════════════

/** GET /api/admin/doctors */
exports.getDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.find().sort({ name: 1 });
    res.json(doctors);
  } catch (error) {
    console.error('Error fetching doctors:', error.message);
    res.status(500).json({ error: 'Failed to fetch doctors' });
  }
};

/** POST /api/admin/doctors */
exports.createDoctor = async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const doctor = await Doctor.create({ name, email });
    res.status(201).json(doctor);
  } catch (error) {
    console.error('Error creating doctor:', error.message);
    res.status(500).json({ error: 'Failed to create doctor' });
  }
};

/** DELETE /api/admin/doctors/:id */
exports.deleteDoctor = async (req, res) => {
  try {
    const instances = await CourseInstance.countDocuments({ doctorId: req.params.id });
    if (instances > 0) {
      return res.status(400).json({ error: `Cannot delete: ${instances} course instance(s) reference this doctor` });
    }
    const doctor = await Doctor.findByIdAndDelete(req.params.id);
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
    res.json({ message: 'Doctor deleted successfully' });
  } catch (error) {
    console.error('Error deleting doctor:', error.message);
    res.status(500).json({ error: 'Failed to delete doctor' });
  }
};

// ═══════════════════════════════════════════
//  COURSE INSTANCES
// ═══════════════════════════════════════════

/** GET /api/admin/course-instances */
exports.getCourseInstances = async (req, res) => {
  try {
    const instances = await CourseInstance.find()
      .populate('courseId', 'courseName courseCode creditHours')
      .populate('doctorId', 'name')
      .sort({ createdAt: -1 });

    res.json(instances);
  } catch (error) {
    console.error('Error fetching course instances:', error.message);
    res.status(500).json({ error: 'Failed to fetch course instances' });
  }
};

/** POST /api/admin/course-instances */
exports.createCourseInstance = async (req, res) => {
  try {
    const { courseId, doctorId, academicYear, semester } = req.body;
    if (!courseId || !doctorId || !academicYear || !semester) {
      return res.status(400).json({ error: 'courseId, doctorId, academicYear, and semester are required' });
    }
    const instance = await CourseInstance.create({ courseId, doctorId, academicYear, semester });
    const populated = await CourseInstance.findById(instance._id)
      .populate('courseId', 'courseName courseCode creditHours')
      .populate('doctorId', 'name');
    res.status(201).json(populated);
  } catch (error) {
    console.error('Error creating course instance:', error.message);
    if (error.code === 11000) return res.status(409).json({ error: 'This course instance already exists for this semester' });
    res.status(500).json({ error: 'Failed to create course instance', details: error.message });
  }
};

/** PUT /api/admin/course-instances/:id */
exports.updateCourseInstance = async (req, res) => {
  try {
    const { courseId, doctorId, academicYear, semester } = req.body;
    const instance = await CourseInstance.findByIdAndUpdate(
      req.params.id,
      { courseId, doctorId, academicYear, semester },
      { returnDocument: 'after', runValidators: true }
    )
      .populate('courseId', 'courseName courseCode creditHours')
      .populate('doctorId', 'name');
    if (!instance) return res.status(404).json({ error: 'Course instance not found' });
    res.json(instance);
  } catch (error) {
    console.error('Error updating course instance:', error.message);
    if (error.code === 11000) return res.status(409).json({ error: 'Duplicate course instance for this semester' });
    res.status(500).json({ error: 'Failed to update course instance', details: error.message });
  }
};

/** DELETE /api/admin/course-instances/:id */
exports.deleteCourseInstance = async (req, res) => {
  try {
    const instance = await CourseInstance.findByIdAndDelete(req.params.id);
    if (!instance) return res.status(404).json({ error: 'Course instance not found' });
    res.json({ message: 'Course instance deleted successfully' });
  } catch (error) {
    console.error('Error deleting course instance:', error.message);
    res.status(500).json({ error: 'Failed to delete course instance' });
  }
};

// ═══════════════════════════════════════════
//  USERS
// ═══════════════════════════════════════════

/** GET /api/admin/users */
exports.getUsers = async (req, res) => {
  try {
    const { search, role, status } = req.query;

    // 1. Fetch all users from Firebase Auth (handles pagination)
    let firebaseUsers = [];
    let pageToken;
    do {
      const result = await admin.auth().listUsers(1000, pageToken);
      firebaseUsers = firebaseUsers.concat(result.users);
      pageToken = result.pageToken;
    } while (pageToken);

    // 2. Fetch all MongoDB users indexed by firebaseUid for O(1) lookup
    const mongoUsers = await User.find({});
    const mongoByUid = {};
    for (const u of mongoUsers) mongoByUid[u.firebaseUid] = u;

    // 3. Merge: Firebase is source of truth for identity, MongoDB for role/accessStatus
    let merged = firebaseUsers.map(fbUser => {
      const mongo = mongoByUid[fbUser.uid] || {};
      return {
        _id: mongo._id || null,
        firebaseUid: fbUser.uid,
        email: fbUser.email || '',
        displayName: fbUser.displayName || '',
        photoURL: fbUser.photoURL || '',
        role: mongo.role || 'student',
        accessStatus: mongo.accessStatus || 'pending',
        createdAt: fbUser.metadata.creationTime,
        updatedAt: mongo.updatedAt || fbUser.metadata.lastSignInTime || fbUser.metadata.creationTime,
      };
    });

    // 4. Apply filters
    if (search) {
      const regex = new RegExp(search, 'i');
      merged = merged.filter(u => regex.test(u.email) || regex.test(u.displayName));
    }
    if (role) merged = merged.filter(u => u.role === role);
    if (status) merged = merged.filter(u => u.accessStatus === status);

    // 5. Sort newest first
    merged.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(merged);
  } catch (error) {
    console.error('Error fetching users:', error.message);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

/** PUT /api/admin/users/:id */
exports.updateUser = async (req, res) => {
  try {
    const { email, displayName, role, accessStatus } = req.body;

    const validRoles = ['student', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `role must be one of: ${validRoles.join(', ')}` });
    }

    const validStatuses = ['active', 'pending', 'blocked'];
    if (!validStatuses.includes(accessStatus)) {
      return res.status(400).json({ error: `accessStatus must be one of: ${validStatuses.join(', ')}` });
    }

    // req.params.id may be a MongoDB _id or a firebaseUid (for users not yet in MongoDB)
    let user = await User.findById(req.params.id).catch(() => null);
    if (!user) user = await User.findOne({ firebaseUid: req.params.id });

    // Resolve the firebaseUid we'll use to update Firebase Auth
    const firebaseUid = user ? user.firebaseUid : req.params.id;

    if (user) {
      const conflict = await User.findOne({ email, _id: { $ne: user._id } });
      if (conflict) return res.status(409).json({ error: 'Email already in use' });
      user = await User.findByIdAndUpdate(
        user._id,
        { email, displayName, role, accessStatus },
        { returnDocument: 'after', runValidators: true }
      );
    } else {
      const conflict = await User.findOne({ email });
      if (conflict) return res.status(409).json({ error: 'Email already in use' });
      user = await User.create({ firebaseUid, email, displayName, role, accessStatus });
    }

    // Sync to Firebase Auth: email, displayName, disabled flag, and admin custom claim
    await admin.auth().updateUser(firebaseUid, {
      email,
      displayName,
      disabled: accessStatus === 'blocked',
    });
    await admin.auth().setCustomUserClaims(firebaseUid, { admin: role === 'admin' });

    res.json(user);
  } catch (error) {
    console.error('Error updating user:', error.message);
    res.status(500).json({ error: 'Failed to update user', details: error.message });
  }
};

/** PATCH /api/admin/users/:id/status */
exports.updateUserStatus = async (req, res) => {
  try {
    const { accessStatus } = req.body;

    const validStatuses = ['active', 'pending', 'blocked'];
    if (!validStatuses.includes(accessStatus)) {
      return res.status(400).json({ error: `accessStatus must be one of: ${validStatuses.join(', ')}` });
    }

    // Try by MongoDB _id first, then by firebaseUid
    let user = await User.findByIdAndUpdate(
      req.params.id,
      { accessStatus },
      { returnDocument: 'after', runValidators: true }
    ).catch(() => null);

    if (!user) {
      user = await User.findOneAndUpdate(
        { firebaseUid: req.params.id },
        { accessStatus },
        { returnDocument: 'after', runValidators: true }
      );
    }

    if (!user) return res.status(404).json({ error: 'User not found' });

    // Sync disabled flag to Firebase Auth
    await admin.auth().updateUser(user.firebaseUid, {
      disabled: accessStatus === 'blocked',
    });

    res.json(user);
  } catch (error) {
    console.error('Error updating user status:', error.message);
    res.status(500).json({ error: 'Failed to update user status', details: error.message });
  }
};

// ═══════════════════════════════════════════
//  PAST EXAMS INGESTION
// ═══════════════════════════════════════════

/** POST /api/admin/upload-past-exam */
exports.uploadPastExam = async (req, res) => {
  try {
    const { courseId, examType, year } = req.body;
    let { lectureIds } = req.body;
    const file = req.file;

    if (!file) return res.status(400).json({ error: 'PDF file is required' });
    if (!courseId || !examType || !year) {
      return res.status(400).json({ error: 'courseId, examType, and year are required' });
    }

    if (!lectureIds) lectureIds = [];
    if (typeof lectureIds === 'string') {
      lectureIds = lectureIds.split(',').map(id => id.trim()).filter(Boolean);
    } else if (!Array.isArray(lectureIds)) {
      lectureIds = [lectureIds];
    }

    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ error: 'Invalid courseId format' });
    }

    let materialFileIds = [];
    if (lectureIds.length > 0) {
      const MaterialFile = require('../models/materials/materialFile.model');
      const resolvedMaterials = await MaterialFile.find({ driveFileId: { $in: lectureIds } }).lean();
      materialFileIds = resolvedMaterials.map(m => m._id);
    }
    
    if (lectureIds.length > 0 && materialFileIds.length === 0) {
       return res.status(404).json({ error: 'Could not resolve any selected Drive IDs to database entries. Sync Drive first.' });
    }

    // ── SMART INGESTION LOGIC ──
    // Fetch all LectureConcepts for these mapped lectures to pass to Semantic Engine
    const LectureConcept = require('../models/lectureConcept.model');
    const concepts = await LectureConcept.find({ materialFileId: { $in: materialFileIds } }).lean();

    const { parseExamAndLinkToLectures } = require('../services/ai.service');
    const examDetails = `This is a ${examType} exam from year ${year}.`;
    
    // Pass buffer and concepts to Gemini to act as a semantic router
    const aiQuestions = await parseExamAndLinkToLectures(file.buffer, examDetails, concepts);

    if (!Array.isArray(aiQuestions) || aiQuestions.length === 0) {
      return res.status(422).json({ error: 'AI processed the PDF but found zero questions.' });
    }

    const ArchivedQuestion = require('../models/archivedQuestion.model');
    const documentsToInsert = [];

    // Validations before inserting
    for (const q of aiQuestions) {
        if (!q.questionText) continue;

        // Semantic Engine assigns linkedLectureId. If it returns null/unknown, 
        // we use a fallback (e.g. the first material file) to satisfy Mongoose `required: true`.
        // If materialFileIds is empty, we still have a problem, but UI blocks empty lecture selection.
        const bestLectureId = q.linkedLectureId || (materialFileIds.length > 0 ? materialFileIds[0] : null);

        if (bestLectureId) {
             documentsToInsert.push({
                 courseId,
                 linkedLectureId: bestLectureId,
                 questionText: q.questionText,
                 options: Array.isArray(q.options) ? q.options : [],
                 correctAnswer: q.correctAnswer || 'Not provided in exam file',
                 examType,
                 year: parseInt(year, 10)
             });
        }
    }

    if (documentsToInsert.length === 0) {
        return res.status(422).json({ error: 'Failed to format any valid questions from AI semantic routing output.' });
    }

    await ArchivedQuestion.insertMany(documentsToInsert);

    res.status(201).json({ 
       message: `Smart Ingestion Complete! Automatically mapped ${documentsToInsert.length} questions to ${concepts.length} semantic concepts.`,
       insertedCount: documentsToInsert.length
    });

  } catch (error) {
    console.error('Error in uploadPastExam:', error.message);
    res.status(500).json({ error: 'Ingestion failed', details: error.message });
  }
};

// ═══════════════════════════════════════════
//  DOCTOR → COURSE LINKAGE (Testing / Setup)
// ═══════════════════════════════════════════

/**
 * POST /api/admin/link-doctor-to-course
 * Creates or updates a CourseInstance linking a doctor to a course.
 * Body: { courseId, doctorId, academicYear?, semester? }
 *
 * This is the "missing link" fix endpoint:
 * The ExamGenerator and LectureProcessor resolve the doctor profile by
 * querying CourseInstance first. Without a CourseInstance record, the
 * professor-style analysis pipeline never fires.
 */
exports.linkDoctorToCourse = async (req, res) => {
  try {
    const { courseId, doctorId, academicYear, semester } = req.body;

    if (!courseId || !doctorId) {
      return res.status(400).json({ error: 'courseId and doctorId are required' });
    }

    const academicYearVal = academicYear || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`;
    const semesterVal = semester || 'Fall';

    // Upsert: if a CourseInstance with this doctor/course/year/semester already exists,
    // return it; otherwise create a new one.
    const instance = await CourseInstance.findOneAndUpdate(
      { courseId, doctorId, academicYear: academicYearVal, semester: semesterVal },
      { courseId, doctorId, academicYear: academicYearVal, semester: semesterVal },
      { upsert: true, returnDocument: 'after', runValidators: true }
    )
      .populate('courseId', 'courseName courseCode')
      .populate('doctorId', 'name');

    res.status(201).json({
      message: `Doctor successfully linked to course. The profiling pipeline will activate on the next lecture upload.`,
      courseInstance: instance,
    });
  } catch (error) {
    console.error('Error linking doctor to course:', error.message);
    if (error.code === 11000) {
      return res.status(409).json({ error: 'This doctor/course/semester combination already exists.' });
    }
    res.status(500).json({ error: 'Failed to link doctor to course', details: error.message });
  }
};

/**
 * POST /api/admin/trigger-profiling/:courseId
 * Manually triggers professor-style analysis for a course using its existing archived questions.
 * This is useful for back-filling DoctorInsight records without re-uploading any files.
 * Resolves: CourseInstance → doctorId → ArchivedQuestion → analyzeProfessorStyle → DoctorInsight
 */
exports.triggerProfiling = async (req, res) => {
  try {
    const { courseId } = req.params;
    const mongoose = require('mongoose');

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ error: 'Invalid courseId format' });
    }

    // Step 1: Find the most-recent CourseInstance to get the doctorId
    const courseInstance = await CourseInstance.findOne({ courseId })
      .sort({ createdAt: -1 })
      .populate('doctorId', 'name')
      .populate('courseId', 'courseName courseCode')
      .lean();

    if (!courseInstance) {
      return res.status(404).json({
        error: 'No CourseInstance found for this course. Use POST /api/admin/link-doctor-to-course first.',
      });
    }

    const doctorId = courseInstance.doctorId._id;

    // Step 2: Fetch all ArchivedQuestions for this course
    const ArchivedQuestion = require('../models/archivedQuestion.model');
    const archivedQuestions = await ArchivedQuestion.find({ courseId }).lean();

    if (archivedQuestions.length < 3) {
      return res.status(422).json({
        error: `Only ${archivedQuestions.length} archived questions found. Minimum 3 required for profiling. Upload past exams first.`,
        count: archivedQuestions.length,
      });
    }

    // Step 3: Run AI style analysis
    const { analyzeProfessorStyle } = require('../services/ai.service');
    const styleProfile = await analyzeProfessorStyle(archivedQuestions);

    // Step 4: Upsert the DoctorInsight document
    const DoctorInsight = require('../models/ai/doctorInsight.model');
    const insight = await DoctorInsight.findOneAndUpdate(
      { doctorId, courseId },
      {
        $set: {
          courseInstanceId: courseInstance._id,
          doctorId,
          courseId,
          preferredQuestionTypes: styleProfile.preferredQuestionTypes || [],
          difficultyDistribution:  styleProfile.difficultyDistribution  || {},
          trickPhrases:            styleProfile.trickPhrases            || [],
          averageQuestionLength:   styleProfile.averageQuestionLength   || 'medium',
          summaryText: `Profile generated from ${archivedQuestions.length} archived questions on ${new Date().toLocaleDateString()}.`,
          generatedAt: new Date(),
        },
      },
      { upsert: true, returnDocument: 'after' }
    );

    res.status(200).json({
      message: `Profiling complete! DoctorInsight created for Dr. ${courseInstance.doctorId.name} — ${courseInstance.courseId.courseName}.`,
      questionsAnalyzed: archivedQuestions.length,
      insight,
    });
  } catch (error) {
    console.error('Error triggering profiling:', error.message);
    res.status(500).json({ error: 'Profiling failed', details: error.message });
  }
};

// ═══════════════════════════════════════════
//  AI SETTINGS
// ═══════════════════════════════════════════

/** GET /api/admin/ai/settings */
exports.getAiSettings = async (req, res) => {
  try {
    let setting = await SystemSetting.findOne({ key: 'ACTIVE_GEMINI_MODEL' });
    
    // Dynamically discover supported models from Google API
    const supportedModels = await aiService.fetchAvailableGeminiModels();

    if (!setting || !supportedModels.includes(setting.value)) {
      if (setting) {
        // Existed but deprecated or not in live discovery list
        setting.value = 'gemini-2.0-flash';
        setting = await setting.save();
      } else {
        // Init
        setting = await SystemSetting.create({ key: 'ACTIVE_GEMINI_MODEL', value: 'gemini-2.0-flash' });
      }
    }
    
    // Ensure memory map correctly hooks whatever is actually in the DB silently on first read
    aiService.updateActiveGeminiModel(setting.value);

    res.json({
      activeModel: setting.value,
      supportedModels
    });
  } catch (error) {
    console.error('Error fetching AI settings:', error.message);
    res.status(500).json({ error: 'Failed to fetch AI Settings.' });
  }
};

/** POST /api/admin/ai/settings */
exports.updateAiSettings = async (req, res) => {
  try {
    const { activeModel } = req.body;
    if (!activeModel) return res.status(400).json({ error: 'activeModel is required' });

    const setting = await SystemSetting.findOneAndUpdate(
      { key: 'ACTIVE_GEMINI_MODEL' },
      { value: activeModel },
      { upsert: true, returnDocument: 'after' }
    );

    // Hard cache update dynamically locking into the Node.js memory loop
    aiService.updateActiveGeminiModel(activeModel);

    res.json({ success: true, activeModel: setting.value });
  } catch (error) {
    console.error('Error updating AI settings:', error.message);
    res.status(500).json({ error: 'Failed to update AI Settings.' });
  }
};
