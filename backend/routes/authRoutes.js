const express = require("express");
const router = express.Router();

const authController = require("../../controllers/authController");
const authMiddleware = require("../../middleware/authMiddleware");
const { requireAdmin } = require("../../utils/roles");

router.post("/login", authController.login);
router.post("/register", authMiddleware, requireAdmin, authController.register);
router.post("/refresh", authController.refresh);
router.post("/logout", authMiddleware, authController.logout);
router.post("/otp/request", authController.requestLoginOtp);
router.post("/otp/verify", authController.verifyLoginOtp);
router.post("/password/forgot", authController.forgotPassword);
router.post("/password/reset", authController.resetPassword);
router.post("/password/change", authMiddleware, authController.changePassword);

router.get("/profile", authMiddleware, authController.profile);

module.exports = router;
