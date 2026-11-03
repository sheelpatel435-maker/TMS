const express = require("express");
const router = express.Router();

const controller = require("../../controllers/driverDocumentController");
const authMiddleware = require("../../middleware/authMiddleware");
const requireModule = require("../../middleware/requireModule");
const { upload } = require("../../middleware/upload");

router.use(authMiddleware);

router.put(
    "/:id",
    requireModule("Drivers", "can_update"),
    upload.single("file"),
    controller.updateDriverDocument
);
router.delete(
    "/:id",
    requireModule("Drivers", "can_delete"),
    controller.deactivateDriverDocument
);
router.get(
    "/:driverId",
    requireModule("Drivers", "can_view"),
    controller.getDriverDocuments
);
router.post(
    "/:driverId",
    requireModule("Drivers", "can_create"),
    upload.single("file"),
    controller.createDriverDocument
);

module.exports = router;
