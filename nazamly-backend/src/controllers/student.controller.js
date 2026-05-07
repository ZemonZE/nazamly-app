// src/controllers/student.controller.js
const userRepo = require('../Repos/User_Repo');
const User = require('../models/user/user.model');
const Course = require('../models/academic/course.model');
const { registerStudentSchema } = require('../middlewares/student.validator');

/**
 * POST /api/students/register
 * Complete the authenticated user's student profile.
 * Validates the body, checks for duplicate studentCode,
 * enforces department defaults, updates the User document,
 * and sets isProfileComplete = true.
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

    // 2. Find the authenticated user
    const currentUser = await userRepo.findByFirebaseUid(req.user.uid);
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'Authenticated user not found in database.'
      });
    }

    // 3. If user already completed onboarding, return 409
    if (currentUser.isProfileComplete) {
      return res.status(409).json({
        success: false,
        message: 'Student profile has already been completed.'
      });
    }

    // 4. Check for duplicate studentCode (across all users)
    const existing = await User.findOne({
      studentCode: value.studentCode,
      _id: { $ne: currentUser._id },
      isDeleted: { $ne: true }
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Student with code "${value.studentCode}" already exists.`
      });
    }

    // 5. Apply department default: if academicYear is 1, force "General"
    if (value.academicYear === 1) {
      value.department = 'General';
    }

    // 6. Update the user's profile on the User document
    const updateData = {
      studentCode: value.studentCode,
      academicYear: value.academicYear,
      department: value.department || 'General',
      cgpa: value.cgpa,
      completedHours: value.completedHours,
      isProfileComplete: true,
    };

    // Map incoming registeredCourses (string ID array) → termCourses embedded objects
    if (value.registeredCourses && value.registeredCourses.length > 0) {
      const courses = await Course.find({
        _id: { $in: value.registeredCourses },
        isDeleted: { $ne: true },
      }).lean();

      updateData.termCourses = courses.map(c => ({
        name: c.courseName,
        courseCode: c.courseCode,
        creditHours: c.creditHours,
      }));
    }

    // Update displayName when fullName is provided (override email-derived names)
    if (value.fullName && value.fullName !== currentUser.displayName) {
      updateData.displayName = value.fullName;
    }

    const updatedUser = await userRepo.update(currentUser._id, updateData);

    return res.status(201).json({
      success: true,
      message: 'Student registered successfully.',
      data: updatedUser
    });

  } catch (error) {
    console.error('Error in registerStudent:', error);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

module.exports = { registerStudent };
