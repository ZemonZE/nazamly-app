// src/controllers/student.controller.js
const StudentProfile = require('../models/studentProfile.model');
const { registerStudentSchema } = require('../middlewares/student.validator');

/**
 * POST /api/students/register
 * Register a new student profile for the Schedule Generator.
 * Validates the body, checks for duplicate studentCode,
 * enforces department defaults, saves, and populates registeredCourses.
 */
const registerStudent = async (req, res) => {
  console.log("[student.controller] registerStudent called");
  try {
    // 1. Validate request body
    const { error, value } = registerStudentSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation Error: Invalid student data.',
        errors: error.details.map(err => err.message)
      });
    }

    // 2. Check for duplicate studentCode
    const existing = await StudentProfile.findOne({ studentCode: value.studentCode });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Student with code "${value.studentCode}" already exists.`
      });
    }

    // 3. Apply department default: if academicYear is 1, force "General"
    if (value.academicYear === 1) {
      value.department = 'General';
    }

    // 4. Save the student profile
    const studentProfile = await StudentProfile.create(value);

    // 5. Populate registeredCourses for immediate use by the Schedule Generator
    const populated = await StudentProfile.findById(studentProfile._id)
      .populate('registeredCourses');

    return res.status(201).json({
      success: true,
      message: 'Student registered successfully.',
      data: populated
    });

  } catch (error) {
    console.error('Error in registerStudent:', error);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

module.exports = { registerStudent };
