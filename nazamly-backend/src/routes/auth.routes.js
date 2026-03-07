const express = require("express");
const router = express.Router();

const requireAuth = require("../middlewares/auth.middleware");
const { syncUser, updateProfile } = require("../controllers/user.controller");

router.post("/sync", requireAuth, syncUser);
router.patch("/profile", requireAuth, updateProfile);

module.exports = router;