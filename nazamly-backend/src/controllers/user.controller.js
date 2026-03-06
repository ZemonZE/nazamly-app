const userRepo = require("../Repos/User_Repo");

const syncUser = async (req, res) => {
  const { uid, email, name, picture } = req.user;

  let user = await userRepo.findByFirebaseUid(uid);

  const isCollege = email.endsWith("@std.sci.cu.edu.eg");

  if (!user) {
    user = await userRepo.create({
      firebaseUid: uid,
      email,
      displayName: name,
      photoURL: picture,
      accessStatus: isCollege ? "active" : "pending",
    });
  }

  res.json({
    message: "Authenticated",
    user,
  });
};

/**
 * @desc    Onboarding Endpoint (Setup Profile)
 * @route   POST /api/gpa/setup-profile
 * @access  Private (Authenticated User)
 * Business Logic:
 * 1. بيجيب الـ userId من الـ authenticated request (req.user.id)
 * 2. بيستخرج currentCGPA و earnedCreditHours من req.body
 * 3. بيعمل validation إن القيم أرقام صالحة
 * 4. بيحدث بيانات الـ user ويرجع 200 OK
 */
const setupProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentCGPA, earnedCreditHours } = req.body;

    if (currentCGPA === undefined || earnedCreditHours === undefined) {
      return res.status(400).json({
        success: false,
        message: "currentCGPA and earnedCreditHours are required",
      });
    }

    if (
      typeof currentCGPA !== "number" ||
      typeof earnedCreditHours !== "number"
    ) {
      return res.status(400).json({
        success: false,
        message: "currentCGPA and earnedCreditHours must be valid numbers",
      });
    }

    if (currentCGPA < 0 || currentCGPA > 5.0) {
      return res.status(400).json({
        success: false,
        message: "currentCGPA must be between 0.0 and 5.0",
      });
    }

    if (earnedCreditHours < 0) {
      return res.status(400).json({
        success: false,
        message: "earnedCreditHours cannot be negative",
      });
    }

    const user = await userRepo.update(userId, {
      currentCGPA,
      earnedCreditHours,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error updating profile",
      error: error.message,
    });
  }
};

module.exports = { syncUser, setupProfile };
