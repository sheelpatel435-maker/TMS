const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middleware/authMiddleware");
const requireModule = require("../../middleware/requireModule");
const controller = require("../../controllers/documentExpiryController");

router.use(authMiddleware);

router.get(
    "/expiring",
    requireModule("Vehicles", "can_view"),
    controller.getExpiringDocuments
);

module.exports = router;
