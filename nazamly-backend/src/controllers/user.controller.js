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

const updateProfile = async (req, res) => {
  const { uid } = req.user;
  const { cgpa, completedHours } = req.body;

  const update = {};
  if (cgpa !== undefined) update.cgpa = Number(cgpa);
  if (completedHours !== undefined) update.completedHours = Number(completedHours);

  const user = await User.findOneAndUpdate(
    { firebaseUid: uid },
    { $set: update },
    { new: true }
  );

  if (!user) return res.status(404).json({ message: "User not found" });
  res.json({ message: "Profile updated", user });
};

/**
 * Verify Admin Role
 * Returns user data if the authenticated user has admin custom claim
 * Used by admin dashboard login to verify authorization
 */
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

module.exports = { syncUser, updateProfile, verifyAdmin };