const express = require("express");
const router = express.Router();

const controller = require("../../controllers/vehicleAssignmentController");
const authMiddleware = require("../../middleware/authMiddleware");
const requireModule = require("../../middleware/requireModule");

router.use(authMiddleware);

router.get("/", requireModule("Vehicles", "can_view"), controller.getVehicleAssignments);
router.post("/", requireModule("Vehicles", "can_create"), controller.createVehicleAssignment);
router.get("/:id", requireModule("Vehicles", "can_view"), controller.getAssignmentById);
router.patch("/:id/close", requireModule("Vehicles", "can_update"), controller.closeVehicleAssignment);

module.exports = router;
