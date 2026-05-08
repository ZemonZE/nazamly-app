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

/**
 * Builds the public base URL for uploaded files.
 * Priority:
 *   1. APP_BASE_URL env var (set this to your LAN IP in .env, e.g. http://192.168.1.105:5000)
 *   2. X-Forwarded-Host header (behind a proxy)
 *   3. req.get("host") — works for same-machine access but NOT for mobile on LAN
 */
function buildBaseUrl(req) {
  if (process.env.APP_BASE_URL) {
    return process.env.APP_BASE_URL.replace(/\/$/, "");
  }
  const proto = req.get("x-forwarded-proto") || "http";
  const host = req.get("x-forwarded-host") || req.get("host");
  return `${proto}://${host}`;
}

const syncUser = async (req, res) => {
  console.log("--- [syncUser] STARTED ---");
  try {
    const { uid, email, name, picture } = req.user;
    console.log(
      `[syncUser] Firebase Data: uid=${uid}, email=${email}, name=${name}`,
    );

    const isCollege = email?.endsWith("@std.sci.cu.edu.eg");
    console.log(`[syncUser] Is college email: ${isCollege}`);

    // Fetch up to 6 courses via courseRepo to automatically embed for new users
    console.log("[syncUser] Fetching initial courses...");
    const courseResult = await courseRepo.findAll({ limit: 6 });

    // Filter out any courses with missing required fields to prevent subdocument validation errors
    const mappedCourses = (courseResult.data || [])
      .filter((c) => c.courseName && c.courseCode && c.creditHours)
      .map((c) => ({
        name: c.courseName,
        courseCode: c.courseCode,
        creditHours: c.creditHours,
      }));
    console.log(`[syncUser] Mapped ${mappedCourses.length} initial courses`);

    // Check if the user already exists to preserve their custom uploaded photo
    const existingUser = await userRepo.findByFirebaseUid(uid);
    const finalPhotoURL =
      existingUser && existingUser.photoURL
        ? existingUser.photoURL
        : picture || "";

    // Upsert by Email via userRepo — if user not found, create new user with data
    console.log("[syncUser] Upserting user in MongoDB...");
    const user = await userRepo.findOrCreateByEmail(
      email,
      {
        firebaseUid: uid,
        displayName: name || "",
        photoURL: finalPhotoURL,
      },
      {
        accessStatus: isCollege ? "active" : "pending",
        role: "student",
        cgpa: 0,
        completedHours: 0,
        termCourses: mappedCourses,
      },
    );
    console.log("[syncUser] User record synchronized:", user._id);

    const finalResponse = {
      success: true,
      message: "User synced successfully",
      user,
    };
    console.log("[syncUser] Sending response...");
    return res.status(200).json(finalResponse);
  } catch (error) {
    console.error("[syncUser] CRITICAL ERROR:", error);
    return res
      .status(500)
      .json({
        success: false,
        message: "Error syncing user",
        error: error.message,
      });
  }
};
const setupProfile = async (req, res) => {
  console.log("--- [setupProfile] STARTED ---");
  try {
    const firebaseUid = req.user.uid;
    console.log(
      `[setupProfile] Looking for user with firebaseUid: ${firebaseUid}`,
    );

    const dbUser = await userRepo.findByFirebaseUid(firebaseUid);
    if (!dbUser) {
      console.log("[setupProfile] User not found in DB");
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const { currentCGPA, earnedCreditHours } = req.body;
    console.log(
      `[setupProfile] Incoming data: CGPA=${currentCGPA}, Hours=${earnedCreditHours}`,
    );

    if (currentCGPA === undefined || earnedCreditHours === undefined)
      return res
        .status(400)
        .json({
          success: false,
          message: "currentCGPA and earnedCreditHours are required",
        });

    if (
      typeof currentCGPA !== "number" ||
      typeof earnedCreditHours !== "number"
    )
      return res
        .status(400)
        .json({
          success: false,
          message: "currentCGPA and earnedCreditHours must be valid numbers",
        });

    console.log("[setupProfile] Validating ranges...");
    if (currentCGPA < 0 || currentCGPA > 5.0)
      return res
        .status(400)
        .json({
          success: false,
          message: "currentCGPA must be between 0.0 and 5.0",
        });

    if (earnedCreditHours < 0 || earnedCreditHours > 400)
      return res
        .status(400)
        .json({
          success: false,
          message: "earnedCreditHours must be between 0 and 400",
        });

    console.log("[setupProfile] Updating user record...");
    const updatedUser = await userRepo.update(dbUser._id, {
      cgpa: currentCGPA,
      completedHours: earnedCreditHours,
    });

    const finalResponse = {
      success: true,
      message: "Profile updated successfully",
      data: updatedUser,
    };
    console.log("[setupProfile] Profile setup complete. Sending response.");
    return res.status(200).json(finalResponse);
  } catch (error) {
    console.error("[setupProfile] CRITICAL ERROR:", error);
    return res
      .status(500)
      .json({
        success: false,
        message: "Error updating profile",
        error: error.message,
      });
  }
};

const getProfile = async (req, res) => {
  console.log("[user.controller] getProfile called");
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
        },
      );
    }

    return res
      .status(200)
      .json({
        success: true,
        message: "Profile retrieved successfully",
        data: user,
      });
  } catch (error) {
    return res
      .status(500)
      .json({
        success: false,
        message: "Error retrieving profile",
        error: error.message,
      });
  }
};

const getStudentCard = async (req, res) => {
  console.log("[user.controller] getStudentCard called");
  try {
    const user = await userRepo.findByFirebaseUid(req.user.uid);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    return res.status(200).json({
      success: true,
      studentCardPhotoURL: user.studentCardPhotoURL || null,
    });
  } catch (error) {
    console.error("[getStudentCard] Error:", error);
    return res
      .status(500)
      .json({
        success: false,
        message: "Error retrieving student card",
        error: error.message,
      });
  }
};

const updatePhoto = async (req, res) => {
  console.log("[user.controller] updatePhoto called");
  try {
    const firebaseUid = req.user.uid;
    const { photoURL } = req.body;
    if (!photoURL || typeof photoURL !== "string")
      return res
        .status(400)
        .json({ success: false, message: "photoURL must be a valid string" });
    try {
      new URL(photoURL);
    } catch {
      return res
        .status(400)
        .json({ success: false, message: "photoURL must be a valid URL" });
    }

    const user = await userRepo.findByFirebaseUid(firebaseUid);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const updatedUser = await userRepo.update(user._id, { photoURL });
    return res
      .status(200)
      .json({
        success: true,
        message: "Photo URL updated successfully",
        data: updatedUser,
      });
  } catch (error) {
    console.error("[updatePhoto] Error:", error);
    return res
      .status(500)
      .json({
        success: false,
        message: "Error updating photo URL",
        error: error.message,
      });
  }
};

const updateStudentCard = async (req, res) => {
  console.log("[user.controller] updateStudentCard called");
  try {
    const firebaseUid = req.user.uid;
    const { studentCardPhotoURL } = req.body;
    if (!studentCardPhotoURL || typeof studentCardPhotoURL !== "string")
      return res
        .status(400)
        .json({
          success: false,
          message: "studentCardPhotoURL must be a valid string",
        });
    try {
      new URL(studentCardPhotoURL);
    } catch {
      return res
        .status(400)
        .json({
          success: false,
          message: "studentCardPhotoURL must be a valid URL",
        });
    }

    const user = await userRepo.findByFirebaseUid(firebaseUid);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const updatedUser = await userRepo.update(user._id, {
      studentCardPhotoURL,
    });
    return res
      .status(200)
      .json({
        success: true,
        message: "Student card photo updated successfully",
        data: updatedUser,
      });
  } catch (error) {
    console.error("[updateStudentCard] Error:", error);
    return res
      .status(500)
      .json({
        success: false,
        message: "Error updating student card photo",
        error: error.message,
      });
  }
};

// ── File upload controllers (Backend + Multer — no Firebase Storage) ──────────

/**
 * POST /api/auth/upload-photo  (multipart/form-data, field: "photo")
 * Saves image to disk, updates photoURL in DB, returns public URL.
 */
const uploadPhotoFile = [
  imageUpload.single("image"),
  async (req, res) => {
    console.log("--- [uploadPhotoFile] STARTED ---");
    try {
      if (!req.file) {
        console.log("[uploadPhotoFile] FAILED: No file found in request");
        return res
          .status(400)
          .json({ success: false, message: "No file uploaded" });
      }
      console.log(
        `[uploadPhotoFile] File received: ${req.file.filename} (${req.file.size} bytes)`,
      );

      const user = await userRepo.findByFirebaseUid(req.user.uid);
      if (!user) {
        console.log("[uploadPhotoFile] FAILED: User not found in DB");
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }
      console.log(`[uploadPhotoFile] Found user: ${user._id}`);

      const photoURL = `/uploads/${req.file.filename}`;
      console.log(`[uploadPhotoFile] Generated relative URL: ${photoURL}`);

      console.log("[uploadPhotoFile] Saving URL to database...");
      const updatedUser = await userRepo.update(user._id, { photoURL });

      const finalResponse = { success: true, photoURL, data: updatedUser };
      console.log("[uploadPhotoFile] SUCCESS: Response ready.");
      return res.status(200).json(finalResponse);
    } catch (err) {
      console.error("[uploadPhotoFile] CRITICAL ERROR:", err);
      return res.status(500).json({ success: false, message: err.message });
    }
  },
];

/**
 * POST /api/auth/upload-student-card  (multipart/form-data, field: "photo")
 * Saves image to disk, updates studentCardPhotoURL in DB, returns public URL.
 */
const uploadStudentCardFile = [
  imageUpload.single("image"),
  async (req, res) => {
    console.log("--- [uploadStudentCardFile] STARTED ---");
    try {
      if (!req.file) {
        console.log("[uploadStudentCardFile] FAILED: No file found in request");
        return res
          .status(400)
          .json({ success: false, message: "No file uploaded" });
      }
      console.log(
        `[uploadStudentCardFile] File received: ${req.file.filename}`,
      );

      const user = await userRepo.findByFirebaseUid(req.user.uid);
      if (!user) {
        console.log("[uploadStudentCardFile] FAILED: User not found in DB");
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      const studentCardPhotoURL = `/uploads/${req.file.filename}`;
      console.log(
        `[uploadStudentCardFile] Generated path: ${studentCardPhotoURL}`,
      );

      console.log(
        "[uploadStudentCardFile] Updating studentCardPhotoURL in DB...",
      );
      const updatedUser = await userRepo.update(user._id, {
        studentCardPhotoURL,
      });

      const finalResponse = {
        success: true,
        studentCardPhotoURL,
        data: updatedUser,
      };
      console.log("[uploadStudentCardFile] SUCCESS: Response ready.");
      return res.status(200).json(finalResponse);
    } catch (err) {
      console.error("[uploadStudentCardFile] CRITICAL ERROR:", err);
      return res.status(500).json({ success: false, message: err.message });
    }
  },
];
const verifyAdmin = async (req, res) => {
  console.log("[user.controller] verifyAdmin called");
  try {
    // req.user comes from authMiddleware (decoded Firebase token with custom claims)

    if (!req.user.admin) {
      return res.status(403).json({
        message: "Forbidden: Admin access required",
      });
    }

    res.json({
      message: "Admin verified",
      user: {
        uid: req.user.uid,
        email: req.user.email,
        name: req.user.name || req.user.email,
        admin: true,
      },
    });
  } catch (error) {
    console.error("Error verifying admin:", error);
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
