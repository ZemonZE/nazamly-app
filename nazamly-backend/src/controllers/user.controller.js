const userRepo = require("../Repos/User_Repo");

const syncUser = async (req, res) => {
  try {
    const { uid, email, name, picture } = req.user;
    
    console.log("[syncUser] Syncing user:", { uid, email, name, picture });

    let user = await userRepo.findByFirebaseUid(uid);

    const isCollege = email?.endsWith("@std.sci.cu.edu.eg");

    if (!user) {
      // Create new user in MongoDB
      console.log("[syncUser] Creating new user in database");
      user = await userRepo.create({
        firebaseUid: uid,
        email: email || "",
        displayName: name || "",
        photoURL: picture || "",
        accessStatus: isCollege ? "active" : "pending",
      });
      console.log("[syncUser] User created successfully:", user._id);
    } else {
      // Update existing user with latest info from Firebase
      console.log("[syncUser] User already exists, updating info");
      const updateData = {};
      
      if (name && name !== user.displayName) {
        updateData.displayName = name;
      }
      if (picture && picture !== user.photoURL) {
        updateData.photoURL = picture;
      }
      
      if (Object.keys(updateData).length > 0) {
        user = await userRepo.update(user._id, updateData);
        console.log("[syncUser] User updated with:", updateData);
      }
    }

    return res.status(200).json({
      success: true,
      message: "User synced successfully",
      user,
    });
  } catch (error) {
    console.error("[syncUser] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error syncing user",
      error: error.message,
    });
  }
};

/**
 * @desc    Onboarding Endpoint (Setup Profile)
 * @route   POST /api/auth/setup-profile
 * @access  Private (Authenticated User)
 * Business Logic:
 * 1. Gets userId from authenticated request (req.user.uid)
 * 2. Extracts currentCGPA and earnedCreditHours from req.body
 * 3. Validates that values are valid numbers
 * 4. Updates user data and returns 200 OK
 */
const setupProfile = async (req, res) => {
  try {
    // ✅ Get MongoDB User ID from Firebase UID
    const firebaseUid = req.user.uid;
    const dbUser = await userRepo.findByFirebaseUid(firebaseUid);
    
    if (!dbUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    
    const userId = dbUser._id;
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

    const updatedUser = await userRepo.update(userId, {
      currentCGPA,
      earnedCreditHours,
    });

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error updating profile",
      error: error.message,
    });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await userRepo.findByFirebaseUid(req.user.uid);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile retrieved successfully",
      data: user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error retrieving profile",
      error: error.message,
    });
  }
};

/**
 * @desc    Update User Photo URL
 * @route   POST /api/auth/update-photo
 * @access  Private (Authenticated User)
 * Business Logic:
 * 1. Gets Firebase UID from authenticated request
 * 2. Looks up MongoDB user by Firebase UID
 * 3. Validates photoURL is provided and is a string
 * 4. Updates user's photoURL in MongoDB
 * 5. Returns updated user data
 */
const updatePhoto = async (req, res) => {
  try {
    // Get Firebase UID from authenticated request
    const firebaseUid = req.user.uid;
    const { photoURL } = req.body;

    console.log("[updatePhoto] Request from user:", firebaseUid);
    console.log("[updatePhoto] New photoURL:", photoURL);

    // Validate photoURL is provided
    if (!photoURL) {
      console.log("[updatePhoto] Error: photoURL is missing");
      return res.status(400).json({
        success: false,
        message: "photoURL is required",
      });
    }

    // Validate photoURL is a string
    if (typeof photoURL !== "string") {
      console.log("[updatePhoto] Error: photoURL is not a string");
      return res.status(400).json({
        success: false,
        message: "photoURL must be a valid string",
      });
    }

    // Optional: Validate URL format
    try {
      new URL(photoURL);
    } catch (error) {
      console.log("[updatePhoto] Error: Invalid URL format");
      return res.status(400).json({
        success: false,
        message: "photoURL must be a valid URL",
      });
    }

    // Find user by Firebase UID
    const user = await userRepo.findByFirebaseUid(firebaseUid);

    if (!user) {
      console.log("[updatePhoto] Error: User not found for UID:", firebaseUid);
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    console.log("[updatePhoto] Found user:", user._id);
    console.log("[updatePhoto] Current photoURL:", user.photoURL);
    console.log("[updatePhoto] Updating to:", photoURL);

    // Update user's photoURL
    const updatedUser = await userRepo.update(user._id, {
      photoURL: photoURL,
    });

    if (!updatedUser) {
      console.log("[updatePhoto] Error: Update failed");
      return res.status(404).json({
        success: false,
        message: "Failed to update user photo",
      });
    }

    console.log("[updatePhoto] Photo updated successfully!");
    console.log("[updatePhoto] New photoURL in DB:", updatedUser.photoURL);

    return res.status(200).json({
      success: true,
      message: "Photo URL updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    console.error("[updatePhoto] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating photo URL",
      error: error.message,
    });
  }
};

module.exports = { syncUser, setupProfile, getProfile, updatePhoto };
