const { User } = require("../models");

const syncUser = async (req, res) => {
  const { uid, email, name, picture } = req.user;

  let user = await User.findOne({ firebaseUid: uid });

  const isCollege = email.endsWith("@std.sci.cu.edu.eg");

  if (!user) {
    user = await User.create({
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

module.exports = { syncUser, updateProfile };