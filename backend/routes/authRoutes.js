const express = require("express");
const router = express.Router();

const authController = require("../../controllers/authController");
const authMiddleware = require("../../middleware/authMiddleware");

router.post("/login", authController.login);
router.post("/refresh", authController.refresh);
router.post("/logout", authMiddleware, authController.logout);

router.get(
    "/profile",
    authMiddleware,
    authController.profile
);

module.exports = router;
