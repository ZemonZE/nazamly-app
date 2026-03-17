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

router.post("/sync", requireAuth, syncUser);
router.post("/setup-profile", requireAuth, setupProfile);
router.get("/get-profile", requireAuth, getProfile);
router.get("/student-card", requireAuth, getStudentCard);
router.post("/update-photo", requireAuth, updatePhoto);
router.post("/update-student-card", requireAuth, updateStudentCard);
router.post("/upload-photo", requireAuth, ...uploadPhotoFile);
router.post("/upload-student-card", requireAuth, ...uploadStudentCardFile);

module.exports = router;
