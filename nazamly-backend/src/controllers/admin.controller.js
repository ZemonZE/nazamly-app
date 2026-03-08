// src/controllers/admin.controller.js
const CourseInstance = require('../models/academic/courseInstance.model');
const Course = require('../models/academic/course.model');
const Doctor = require('../models/academic/doctor.model');

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
      { new: true, runValidators: true }
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
      { new: true, runValidators: true }
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
