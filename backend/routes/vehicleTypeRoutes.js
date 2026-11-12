const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middleware/authMiddleware");
const requireModule = require("../../middleware/requireModule");
const controller = require("../../controllers/vehicleTypeController");
const { requireAdminVehicleUser, requireVehicleId } = require("../../middleware/vehicleAccess");

router.use(authMiddleware);
router.use(requireAdminVehicleUser);
const enforceVehicleAccess = { allowAdminBypass: false };

router.get("/", requireModule("Vehicle Types", "can_view", enforceVehicleAccess), controller.getVehicleTypes);
router.post("/", requireModule("Vehicle Types", "can_create", enforceVehicleAccess), controller.createVehicleType);
router.get("/:id", requireVehicleId, requireModule("Vehicle Types", "can_view", enforceVehicleAccess), controller.getVehicleTypeById);
router.put("/:id", requireVehicleId, requireModule("Vehicle Types", "can_update", enforceVehicleAccess), controller.updateVehicleType);
router.delete("/:id", requireVehicleId, requireModule("Vehicle Types", "can_update", enforceVehicleAccess), controller.deactivateVehicleType);

module.exports = router;
