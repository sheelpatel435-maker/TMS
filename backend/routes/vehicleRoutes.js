const express = require("express");
const router = express.Router();

const controller = require("../../controllers/vehicleController");
const authMiddleware = require("../../middleware/authMiddleware");
const requireModule = require("../../middleware/requireModule");
const {
    requireAdminVehicleUser,
    requireMobileVehicleUser,
    requireVehicleId
} = require("../../middleware/vehicleAccess");

router.use(authMiddleware);

router.get("/my-vehicle", requireMobileVehicleUser, controller.getMyAssignedVehicle);
router.use(requireAdminVehicleUser);

// COMPANY_ADMIN / SUPER_ADMIN bypass module ACL (BRD); COMPANY_USER still needs Vehicles flags
router.get("/", requireModule("Vehicles", "can_view"), controller.getVehicles);
router.post("/", requireModule("Vehicles", "can_create"), controller.createVehicle);
router.get(
    "/:id/trip-history",
    requireVehicleId,
    requireModule("Vehicles", "can_view"),
    controller.getVehicleTripHistory
);
router.get(
    "/:id",
    requireVehicleId,
    requireModule("Vehicles", "can_view"),
    controller.getVehicleById
);
router.put(
    "/:id",
    requireVehicleId,
    requireModule("Vehicles", "can_update"),
    controller.updateVehicle
);
router.patch(
    "/:id/status",
    requireVehicleId,
    requireModule("Vehicles", "can_update"),
    controller.setVehicleStatus
);
router.delete(
    "/:id",
    requireVehicleId,
    requireModule("Vehicles", "can_update"),
    controller.deactivateVehicle
);

module.exports = router;
