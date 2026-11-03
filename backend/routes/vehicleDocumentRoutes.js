const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middleware/authMiddleware");
const requireModule = require("../../middleware/requireModule");
const { upload } = require("../../middleware/upload");
const controller = require("../../controllers/vehicleDocumentController");

router.use(authMiddleware);

router.get("/", requireModule("Vehicles", "can_view"), controller.getVehicleDocuments);
router.post(
    "/",
    requireModule("Vehicles", "can_create"),
    upload.single("file"),
    controller.createVehicleDocument
);
router.put(
    "/:id",
    requireModule("Vehicles", "can_update"),
    upload.single("file"),
    controller.updateVehicleDocument
);
router.delete(
    "/:id",
    requireModule("Vehicles", "can_delete"),
    controller.deactivateVehicleDocument
);
router.get("/:vehicleId", requireModule("Vehicles", "can_view"), controller.getVehicleDocuments);
router.post(
    "/:vehicleId",
    requireModule("Vehicles", "can_create"),
    upload.single("file"),
    controller.createVehicleDocument
);

module.exports = router;
