const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middleware/authMiddleware");
const requireModule = require("../../middleware/requireModule");
const controller = require("../../controllers/vehicleTypeController");

router.use(authMiddleware);

router.get("/", requireModule("Vehicle Types", "can_view"), controller.getVehicleTypes);
router.post("/", requireModule("Vehicle Types", "can_create"), controller.createVehicleType);
router.get("/:id", requireModule("Vehicle Types", "can_view"), controller.getVehicleTypeById);
router.put("/:id", requireModule("Vehicle Types", "can_update"), controller.updateVehicleType);
router.delete("/:id", requireModule("Vehicle Types", "can_delete"), controller.deactivateVehicleType);

module.exports = router;
