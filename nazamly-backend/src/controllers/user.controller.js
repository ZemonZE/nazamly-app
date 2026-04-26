const userRepo = require("../Repos/User_Repo");
const courseRepo = require("../Repos/Course_Repo");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ── Disk storage for uploaded images ─────────────────────────────────────────
const uploadsDir = path.join(__dirname, "../../../uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const diskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const imageUpload = multer({
  storage: diskStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

// ── Auth / Profile controllers ────────────────────────────────────────────────

const syncUser = async (req, res) => {
  try {
    const { uid, email, name, picture } = req.user;
    const isCollege = email?.endsWith("@std.sci.cu.edu.eg");

    // Fetch up to 6 courses via courseRepo to automatically embed for new users
    const courseResult = await courseRepo.findAll({ limit: 6 });
    // Filter out any courses with missing required fields to prevent subdocument validation errors
    const mappedCourses = (courseResult.data || [])
      .filter(c => c.courseName && c.courseCode && c.creditHours)
      .map(c => ({
        name: c.courseName,
        courseCode: c.courseCode,
        creditHours: c.creditHours
      }));

    // Upsert by Email via userRepo — if user not found, create new user with data
    const user = await userRepo.findOrCreateByEmail(
      email,
      // $set — always updated on every sync
      {
        firebaseUid: uid,
        displayName: name || "",
        photoURL: picture || "",
      },
      // $setOnInsert — only applied when creating a new user
      {
        accessStatus: isCollege ? "active" : "pending",
        role: "student",
        cgpa: 0,
        completedHours: 0,
        termCourses: mappedCourses,
      }
    );

    return res.status(200).json({ success: true, message: "User synced successfully", user });
  } catch (error) {
    console.error("[syncUser] Error:", error);
    return res.status(500).json({ success: false, message: "Error syncing user", error: error.message });
  }
};
const setupProfile = async (req, res) => {
  try {
    const firebaseUid = req.user.uid;
    const dbUser = await userRepo.findByFirebaseUid(firebaseUid);
    if (!dbUser) return res.status(404).json({ success: false, message: "User not found" });

    const { currentCGPA, earnedCreditHours } = req.body;

    if (currentCGPA === undefined || earnedCreditHours === undefined)
      return res.status(400).json({ success: false, message: "currentCGPA and earnedCreditHours are required" });

    if (typeof currentCGPA !== "number" || typeof earnedCreditHours !== "number")
      return res.status(400).json({ success: false, message: "currentCGPA and earnedCreditHours must be valid numbers" });

    if (currentCGPA < 0 || currentCGPA > 5.0)
      return res.status(400).json({ success: false, message: "currentCGPA must be between 0.0 and 5.0" });

    if (earnedCreditHours < 0)
      return res.status(400).json({ success: false, message: "earnedCreditHours cannot be negative" });

    const updatedUser = await userRepo.update(dbUser._id, {
      cgpa: currentCGPA,
      completedHours: earnedCreditHours,
    });
    if (!updatedUser) return res.status(404).json({ success: false, message: "User not found" });

    return res.status(200).json({ success: true, message: "Profile updated successfully", data: updatedUser });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error updating profile", error: error.message });
  }
};

const getProfile = async (req, res) => {
  try {
    let user = await userRepo.findByFirebaseUid(req.user.uid);

    // Auto-create: لو الـ user لسه مش موجود في MongoDB (أول login)
    // بننشئه تلقائياً من بيانات الـ Firebase token بدل ما نرجع 404
    if (!user) {
      const { uid, email, name, picture } = req.user;
      const isCollege = email?.endsWith("@std.sci.cu.edu.eg");

      user = await userRepo.findOrCreateByEmail(
        email,
        { firebaseUid: uid, displayName: name || "", photoURL: picture || "" },
        {
          accessStatus: isCollege ? "active" : "pending",
          role: "student",
          cgpa: 0,
          completedHours: 0,
          termCourses: [],
        }
      );
    }

    return res.status(200).json({ success: true, message: "Profile retrieved successfully", data: user });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error retrieving profile", error: error.message });
  }
};

const getStudentCard = async (req, res) => {
  try {
    const user = await userRepo.findByFirebaseUid(req.user.uid);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    return res.status(200).json({
      success: true,
      studentCardPhotoURL: user.studentCardPhotoURL || null,
    });
  } catch (error) {
    console.error("[getStudentCard] Error:", error);
    return res.status(500).json({ success: false, message: "Error retrieving student card", error: error.message });
  }
};

const updatePhoto = async (req, res) => {
  try {
    const firebaseUid = req.user.uid;
    const { photoURL } = req.body;
    if (!photoURL || typeof photoURL !== "string")
      return res.status(400).json({ success: false, message: "photoURL must be a valid string" });
    try { new URL(photoURL); } catch { return res.status(400).json({ success: false, message: "photoURL must be a valid URL" }); }

    const user = await userRepo.findByFirebaseUid(firebaseUid);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const updatedUser = await userRepo.update(user._id, { photoURL });
    return res.status(200).json({ success: true, message: "Photo URL updated successfully", data: updatedUser });
  } catch (error) {
    console.error("[updatePhoto] Error:", error);
    return res.status(500).json({ success: false, message: "Error updating photo URL", error: error.message });
  }
};

const updateStudentCard = async (req, res) => {
  try {
    const firebaseUid = req.user.uid;
    const { studentCardPhotoURL } = req.body;
    if (!studentCardPhotoURL || typeof studentCardPhotoURL !== "string")
      return res.status(400).json({ success: false, message: "studentCardPhotoURL must be a valid string" });
    try { new URL(studentCardPhotoURL); } catch { return res.status(400).json({ success: false, message: "studentCardPhotoURL must be a valid URL" }); }

    const user = await userRepo.findByFirebaseUid(firebaseUid);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const updatedUser = await userRepo.update(user._id, { studentCardPhotoURL });
    return res.status(200).json({ success: true, message: "Student card photo updated successfully", data: updatedUser });
  } catch (error) {
    console.error("[updateStudentCard] Error:", error);
    return res.status(500).json({ success: false, message: "Error updating student card photo", error: error.message });
  }
};

// ── File upload controllers (Backend + Multer — no Firebase Storage) ──────────

/**
 * POST /api/auth/upload-photo  (multipart/form-data, field: "photo")
 * Saves image to disk, updates photoURL in DB, returns public URL.
 */
const uploadPhotoFile = [
  imageUpload.single("photo"),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });
      const user = await userRepo.findByFirebaseUid(req.user.uid);
      if (!user) return res.status(404).json({ success: false, message: "User not found" });
      const host = req.get("host");
      const photoURL = `http://${host}/uploads/${req.file.filename}`;
      const updatedUser = await userRepo.update(user._id, { photoURL });
      return res.status(200).json({ success: true, photoURL, data: updatedUser });
    } catch (err) {
      console.error("[uploadPhotoFile]", err);
      return res.status(500).json({ success: false, message: err.message });
    }
  },
];

/**
 * @POST /api/auth/upload-student-card  (multipart/form-data, field: "photo")
 * @Saves image to disk, updates studentCardPhotoURL in DB, returns public URL.
 */
const uploadStudentCardFile = [
  imageUpload.single("photo"),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });
      const user = await userRepo.findByFirebaseUid(req.user.uid);
      if (!user) return res.status(404).json({ success: false, message: "User not found" });
      const host = req.get("host");
      const studentCardPhotoURL = `http://${host}/uploads/${req.file.filename}`;
      const updatedUser = await userRepo.update(user._id, { studentCardPhotoURL });
      return res.status(200).json({ success: true, data: updatedUser });
    } catch (err) {
      console.error("[uploadStudentCardFile]", err);
      return res.status(500).json({ success: false, message: err.message });
    }
  },
];
const verifyAdmin = async (req, res) => {
  try {
    // req.user comes from authMiddleware (decoded Firebase token with custom claims)
    
    if (!req.user.admin) {
      return res.status(403).json({ 
        message: 'Forbidden: Admin access required' 
      });
    }
    
    res.json({
      message: "Admin verified",
      user: {
        uid: req.user.uid,
        email: req.user.email,
        name: req.user.name || req.user.email,
        admin: true
      }
    });
  } catch (error) {
    console.error('Error verifying admin:', error);
    res.status(500).json({ message: "Error verifying admin status" });
  }
};
module.exports = {
  syncUser,
  setupProfile,
  getProfile,
  getStudentCard,
  updatePhoto,
  updateStudentCard,
  uploadPhotoFile,
  uploadStudentCardFile,
  verifyAdmin,
};
