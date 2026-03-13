const express = require("express");
const router = express.Router();

const requireAuth = require("../middlewares/auth.middleware");
const { syncUser, updateProfile, verifyAdmin } = require("../controllers/user.controller");

router.post("/sync", requireAuth, syncUser);
router.patch("/profile", requireAuth, updateProfile);
router.get("/verify-admin", requireAuth, verifyAdmin);

module.exports = router;