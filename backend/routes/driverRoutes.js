const express = require("express");
const router = express.Router();

const controller = require("../../controllers/driverController");
const authMiddleware = require("../../middleware/authMiddleware");
const requireModule = require("../../middleware/requireModule");

router.use(authMiddleware);

router.get("/", requireModule("Drivers", "can_view"), controller.getDrivers);
router.post("/", requireModule("Drivers", "can_create"), controller.createDriver);
router.get("/:id", requireModule("Drivers", "can_view"), controller.getDriverById);
router.put("/:id", requireModule("Drivers", "can_update"), controller.updateDriver);
router.delete("/:id", requireModule("Drivers", "can_delete"), controller.deactivateDriver);

module.exports = router;
