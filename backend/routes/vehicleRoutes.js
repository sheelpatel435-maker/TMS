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

const enforceVehicleAccess = { allowAdminBypass: false };

router.get("/", requireModule("Vehicles", "can_view", enforceVehicleAccess), controller.getVehicles);
router.post("/", requireModule("Vehicles", "can_create", enforceVehicleAccess), controller.createVehicle);
router.get(
    "/:id/trip-history",
    requireVehicleId,
    requireModule("Vehicles", "can_view", enforceVehicleAccess),
    controller.getVehicleTripHistory
);
router.get(
    "/:id",
    requireVehicleId,
    requireModule("Vehicles", "can_view", enforceVehicleAccess),
    controller.getVehicleById
);
router.put(
    "/:id",
    requireVehicleId,
    requireModule("Vehicles", "can_update", enforceVehicleAccess),
    controller.updateVehicle
);
router.delete(
    "/:id",
    requireVehicleId,
    requireModule("Vehicles", "can_update", enforceVehicleAccess),
    controller.deactivateVehicle
);

module.exports = router;
