const express = require("express");
const router = express.Router();

const requireAuth = require("../middlewares/auth.middleware");
const { syncUser } = require("../controllers/user.controller");

router.post("/sync", requireAuth, syncUser);

module.exports = router;