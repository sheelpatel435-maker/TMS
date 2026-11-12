const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middleware/authMiddleware");
const requireModule = require("../../middleware/requireModule");
const controller = require("../../controllers/documentExpiryController");
const { requireAdminVehicleUser } = require("../../middleware/vehicleAccess");

router.use(authMiddleware);
router.use(requireAdminVehicleUser);

router.get(
    "/expiring",
    requireModule("Vehicles", "can_view", { allowAdminBypass: false }),
    controller.getExpiringDocuments
);

module.exports = router;
