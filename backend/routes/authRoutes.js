const express = require("express");
const router = express.Router();

const authController = require("../../controllers/authController");
const authMiddleware = require("../../middleware/authMiddleware");
const { requireAdmin } = require("../../utils/roles");

router.post("/login", authController.login);
router.post("/forgot-password", authController.forgotPassword);
router.post("/verify-otp", authController.verifyOtp);
router.post("/reset-password", authController.resetPassword);
router.post("/register", authMiddleware, requireAdmin, authController.register);
router.post("/refresh", authController.refresh);
router.post("/logout", authMiddleware, authController.logout);

router.get(
    "/profile",
    authMiddleware,
    authController.profile
);

module.exports = router;
