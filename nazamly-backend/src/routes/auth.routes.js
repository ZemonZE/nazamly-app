const express = require("express");
const router = express.Router();

const requireAuth = require("../middlewares/auth.middleware");
const {
  syncUser,
  setupProfile,
  getProfile,
  getStudentCard,
  updatePhoto,
  updateStudentCard,
  uploadPhotoFile,
  uploadStudentCardFile,
} = require("../controllers/user.controller");

/**
 * @route   POST /api/auth/sync
 * @desc    Sync user data after Firebase login
 * @access  Private
 */
router.post("/sync", requireAuth, syncUser);

/**
 * @route   POST /api/auth/setup-profile
 * @desc    Setup user profile after registration
 * @access  Private
 */
router.post("/setup-profile", requireAuth, setupProfile);

/**
 * @route   GET /api/auth/get-profile
 * @desc    Get user profile data
 * @access  Private
 */
router.get("/get-profile", requireAuth, getProfile);

/**
 * @route   GET /api/auth/student-card
 * @desc    Get user student card image URL
 * @access  Private
 */
router.get("/student-card", requireAuth, getStudentCard);

/**
 * @route   POST /api/auth/update-photo
 * @desc    Update user profile photo using URL
 * @access  Private
 */
router.post("/update-photo", requireAuth, updatePhoto);

/**
 * @route   POST /api/auth/update-student-card
 * @desc    Update user student card photo using URL
 * @access  Private
 */
router.post("/update-student-card", requireAuth, updateStudentCard);

/**
 * @route   POST /api/auth/upload-photo
 * @desc    Upload user profile photo file
 * @access  Private
 */
router.post("/upload-photo", requireAuth, ...uploadPhotoFile);

/**
 * @route   POST /api/auth/upload-student-card
 * @desc    Upload user student card file
 * @access  Private
 */
router.post("/upload-student-card", requireAuth, ...uploadStudentCardFile);

module.exports = router;
