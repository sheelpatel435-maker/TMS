const express = require("express");
const router = express.Router();

const controller = require("../../controllers/driverDocumentController");
const authMiddleware = require("../../middleware/authMiddleware");
const requireModule = require("../../middleware/requireModule");
const { upload } = require("../../middleware/upload");

router.get(
    "/:driverId",
    authMiddleware,
    requireModule("Drivers", "can_view"),
    controller.getDriverDocuments
);

router.post(
    "/:driverId",
    authMiddleware,
    requireModule("Drivers", "can_create"),
    upload.single("file"),
    controller.createDriverDocument
);

module.exports = router;
