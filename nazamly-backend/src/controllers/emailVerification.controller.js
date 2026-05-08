const User_Repo = require('../Repos/User_Repo');

/**
 * confirmEmailVerified - POST /api/auth/confirm-email-verified
 *
 * Logic:
 * 1. Check req.user.email_verified. If false → 400.
 * 2. Find user by req.user.uid via User_Repo.findByFirebaseUid. If not found → 404.
 * 3. If accessStatus === "active" → 200 (idempotent, no DB write).
 * 4. Otherwise update accessStatus to "active" → 200 with updated user.
 *
 */
async function confirmEmailVerified(req, res) {
  console.log("[emailVerification.controller] confirmEmailVerified called");

  // Step 1: Check Firebase token's email_verified claim
  if (!req.user.email_verified) {
    return res.status(400).json({ message: "Email has not been verified yet" });
  }

  // Step 2: Find user in MongoDB by Firebase UID
  const user = await User_Repo.findByFirebaseUid(req.user.uid);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  // Step 3: Idempotency — already active, no DB write needed
  if (user.accessStatus === "active") {
    return res.status(200).json({ message: "Email already verified", user });
  }

  // Step 4: Update accessStatus to "active"
  const updatedUser = await User_Repo.updateByFirebaseUid(req.user.uid, {
    accessStatus: "active",
  });

  return res.status(200).json({ user: updatedUser });
}

module.exports = { confirmEmailVerified };
