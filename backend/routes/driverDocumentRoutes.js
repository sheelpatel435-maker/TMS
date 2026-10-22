const express = require("express");
const router = express.Router();

const controller = require("../../controllers/driverDocumentController");
const authMiddleware = require("../../middleware/authMiddleware");

router.get(
    "/:driverId",
    authMiddleware,
    controller.getDriverDocuments
);

router.post(
    "/:driverId",
    authMiddleware,
    controller.createDriverDocument
);

module.exports = router;