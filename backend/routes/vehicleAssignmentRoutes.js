const express = require("express");
const router = express.Router();

const controller = require("../../controllers/vehicleAssignmentController");
const authMiddleware = require("../../middleware/authMiddleware");
const requireModule = require("../../middleware/requireModule");
const { requireAdminVehicleUser, requireVehicleId } = require("../../middleware/vehicleAccess");

router.use(authMiddleware);
router.use(requireAdminVehicleUser);
const enforceVehicleAccess = { allowAdminBypass: false };

router.get("/", requireModule("Vehicles", "can_view", enforceVehicleAccess), controller.getVehicleAssignments);
router.post("/", requireModule("Vehicles", "can_create", enforceVehicleAccess), controller.createVehicleAssignment);
router.get("/:id", requireVehicleId, requireModule("Vehicles", "can_view", enforceVehicleAccess), controller.getAssignmentById);
router.put("/:id", requireVehicleId, requireModule("Vehicles", "can_update", enforceVehicleAccess), controller.updateVehicleAssignment);
router.delete("/:id", requireVehicleId, requireModule("Vehicles", "can_update", enforceVehicleAccess), controller.deactivateVehicleAssignment);
router.patch("/:id/close", requireVehicleId, requireModule("Vehicles", "can_update", enforceVehicleAccess), controller.closeVehicleAssignment);

module.exports = router;
