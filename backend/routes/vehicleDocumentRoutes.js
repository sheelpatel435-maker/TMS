const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middleware/authMiddleware");
const requireModule = require("../../middleware/requireModule");
const { upload } = require("../../middleware/upload");
const controller = require("../../controllers/vehicleDocumentController");
const { requireAdminVehicleUser, requireVehicleId } = require("../../middleware/vehicleAccess");

router.use(authMiddleware);
router.use(requireAdminVehicleUser);
const enforceVehicleAccess = { allowAdminBypass: false };

router.get(
    "/types",
    requireModule("Vehicles", "can_view", enforceVehicleAccess),
    controller.getVehicleDocumentTypes
);
router.post(
    "/types",
    requireModule("Vehicles", "can_create", enforceVehicleAccess),
    controller.createVehicleDocumentType
);
router.delete(
    "/types/:id",
    requireVehicleId,
    requireModule("Vehicles", "can_update", enforceVehicleAccess),
    controller.deactivateVehicleDocumentType
);
router.get("/", requireModule("Vehicles", "can_view", enforceVehicleAccess), controller.getVehicleDocuments);
router.post(
    "/",
    requireModule("Vehicles", "can_create", enforceVehicleAccess),
    upload.single("file"),
    controller.createVehicleDocument
);
router.put(
    "/:id",
    requireVehicleId,
    requireModule("Vehicles", "can_update", enforceVehicleAccess),
    upload.single("file"),
    controller.updateVehicleDocument
);
router.patch(
    "/:id/verification",
    requireVehicleId,
    requireModule("Vehicles", "can_approve", enforceVehicleAccess),
    controller.verifyVehicleDocument
);
router.delete(
    "/:id",
    requireVehicleId,
    requireModule("Vehicles", "can_update", enforceVehicleAccess),
    controller.deactivateVehicleDocument
);
router.get(
    "/:vehicleId",
    requireVehicleId,
    requireModule("Vehicles", "can_view", enforceVehicleAccess),
    controller.getVehicleDocuments
);
router.post(
    "/:vehicleId",
    requireVehicleId,
    requireModule("Vehicles", "can_create", enforceVehicleAccess),
    upload.single("file"),
    controller.createVehicleDocument
);

module.exports = router;
