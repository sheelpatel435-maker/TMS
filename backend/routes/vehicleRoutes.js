const express = require("express");
const router = express.Router();

const controller = require("../../controllers/vehicleController");
const authMiddleware = require("../../middleware/authMiddleware");
const requireModule = require("../../middleware/requireModule");

router.use(authMiddleware);

router.get("/", requireModule("Vehicles", "can_view"), controller.getVehicles);
router.post("/", requireModule("Vehicles", "can_create"), controller.createVehicle);
router.get("/:id", requireModule("Vehicles", "can_view"), controller.getVehicleById);
router.put("/:id", requireModule("Vehicles", "can_update"), controller.updateVehicle);
router.delete("/:id", requireModule("Vehicles", "can_delete"), controller.deactivateVehicle);

module.exports = router;
