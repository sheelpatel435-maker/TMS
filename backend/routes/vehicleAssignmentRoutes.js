const express = require("express");

const router = express.Router();

const controller = require("../../controllers/vehicleAssignmentController");
const authMiddleware = require("../../middleware/authMiddleware");

router.get(
    "/",
    authMiddleware,
    controller.getVehicleAssignments
);

router.post(
    "/",
    authMiddleware,
    controller.createVehicleAssignment
);

module.exports = router;
