const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middleware/authMiddleware");
const requireModule = require("../../middleware/requireModule");
const { upload } = require("../../middleware/upload");
const controller = require("../../controllers/tripDocumentController");

router.use(authMiddleware);

router.get(
    "/",
    requireModule("Trips", "can_view"),
    controller.getTripDocuments
);
router.post(
    "/",
    requireModule("Trips", "can_update"),
    upload.single("file"),
    controller.createTripDocument
);
router.delete(
    "/:id",
    requireModule("Trips", "can_update"),
    controller.deactivateTripDocument
);

module.exports = router;
