const express = require("express");
const router = express.Router();

const controller = require("../../controllers/vehicleAssignmentController");
const authMiddleware = require("../../middleware/authMiddleware");
const requireModule = require("../../middleware/requireModule");
const { requireAdminVehicleUser, requireVehicleId } = require("../../middleware/vehicleAccess");

router.use(authMiddleware);
router.use(requireAdminVehicleUser);

router.get("/", requireModule("Vehicles", "can_view"), controller.getVehicleAssignments);
router.get(
    "/history",
    requireModule("Vehicles", "can_view"),
    controller.getAssignmentHistory
);
router.post("/", requireModule("Vehicles", "can_create"), controller.createVehicleAssignment);
router.get("/:id", requireVehicleId, requireModule("Vehicles", "can_view"), controller.getAssignmentById);
router.put("/:id", requireVehicleId, requireModule("Vehicles", "can_update"), controller.updateVehicleAssignment);
router.delete("/:id", requireVehicleId, requireModule("Vehicles", "can_update"), controller.deactivateVehicleAssignment);
router.patch("/:id/close", requireVehicleId, requireModule("Vehicles", "can_update"), controller.closeVehicleAssignment);

module.exports = router;
