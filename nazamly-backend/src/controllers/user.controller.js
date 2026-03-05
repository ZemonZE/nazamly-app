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

module.exports = { syncUser };