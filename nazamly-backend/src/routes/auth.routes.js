const express = require("express");
const router = express.Router();

const requireAuth = require("../middlewares/auth.middleware");
const { syncUser, setupProfile, getProfile, updatePhoto } = require("../controllers/user.controller");

router.post("/sync", requireAuth, syncUser);
router.post("/setup-profile", requireAuth, setupProfile);
router.get("/get-profile", requireAuth, getProfile);
router.post("/update-photo", requireAuth, updatePhoto);

module.exports = router;