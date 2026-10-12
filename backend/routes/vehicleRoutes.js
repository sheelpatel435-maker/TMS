const express = require("express");
const router = express.Router();

const controller = require("../controllers/vehicleController");
const authMiddleware = require("../middleware/authMiddleware");

router.get(
    "/",
    authMiddleware,
    controller.getVehicles
);

router.post(
    "/",
    authMiddleware,
    controller.createVehicle
);

module.exports = router;