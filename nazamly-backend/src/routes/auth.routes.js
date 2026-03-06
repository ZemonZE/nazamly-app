const express = require("express");
const router = express.Router();

const requireAuth = require("../middlewares/auth.middleware");
const { syncUser, setupProfile } = require("../controllers/user.controller");

router.post("/sync", requireAuth, syncUser);
router.post("/setup-profile", requireAuth, setupProfile);

module.exports = router;