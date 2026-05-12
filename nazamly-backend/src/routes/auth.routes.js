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
  verifyAdmin,
  uploadStudentCardFile,
} = require("../controllers/user.controller");
const { confirmEmailVerified } = require("../controllers/emailVerification.controller");

router.post("/sync", requireAuth, syncUser);

router.post("/setup-profile", requireAuth, setupProfile);

router.get("/get-profile", requireAuth, getProfile);

router.get("/student-card", requireAuth, getStudentCard);

router.post("/update-photo", requireAuth, updatePhoto);

router.post("/update-student-card", requireAuth, updateStudentCard);

router.post("/upload-photo", requireAuth, ...uploadPhotoFile);

router.post("/upload-student-card", requireAuth, ...uploadStudentCardFile);
router.get("/verify-admin", requireAuth, verifyAdmin);

router.post("/confirm-email-verified", requireAuth, confirmEmailVerified);

module.exports = router;
