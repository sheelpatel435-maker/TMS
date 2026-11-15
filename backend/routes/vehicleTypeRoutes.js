const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middleware/authMiddleware");
const requireModule = require("../../middleware/requireModule");
const controller = require("../../controllers/vehicleTypeController");
const { requireAdminVehicleUser, requireVehicleId } = require("../../middleware/vehicleAccess");

router.use(authMiddleware);
router.use(requireAdminVehicleUser);

router.get("/", requireModule("Vehicle Types", "can_view"), controller.getVehicleTypes);
router.post("/", requireModule("Vehicle Types", "can_create"), controller.createVehicleType);
router.get("/:id", requireVehicleId, requireModule("Vehicle Types", "can_view"), controller.getVehicleTypeById);
router.put("/:id", requireVehicleId, requireModule("Vehicle Types", "can_update"), controller.updateVehicleType);
router.delete("/:id", requireVehicleId, requireModule("Vehicle Types", "can_update"), controller.deactivateVehicleType);

module.exports = router;
