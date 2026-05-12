const User_Repo = require('../Repos/User_Repo');

async function requireActiveUser(req, res, next) {
  try {
    const user = await User_Repo.findByFirebaseUid(req.user.uid);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (user.accessStatus !== 'active') {
      return res.status(403).json({
        message: 'Email verification required',
        code: 'EMAIL_NOT_VERIFIED',
      });
    }
    next();
  } catch (err) {
    console.error('[requireActiveUser]', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

module.exports = requireActiveUser;
