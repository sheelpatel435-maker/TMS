const express = require("express");
const router = express.Router();

const authController = require("../../controllers/authController");
const authMiddleware = require("../../middleware/authMiddleware");

router.post("/login", authController.login);
router.post("/register", (_req, res) =>
    res.status(410).json({
        success: false,
        message: "Ye endpoint band hai. Admin panel se user banaye jaate hain."
    })
);
router.post("/refresh", authController.refresh);
router.post("/logout", authMiddleware, authController.logout);
router.post("/otp/request", authController.requestLoginOtp);
router.post("/otp/verify", authController.verifyLoginOtp);
router.post("/password/forgot", authController.forgotPassword);
router.post("/password/reset", authController.resetPassword);
router.post("/password/change", authMiddleware, authController.changePassword);

router.get("/profile", authMiddleware, authController.profile);

module.exports = router;
