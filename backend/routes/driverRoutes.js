const express = require("express");
const router = express.Router();

const controller = require("../../controllers/driverController");
const authMiddleware = require("../../middleware/authMiddleware");

router.get(
    "/",
    authMiddleware,
    controller.getDrivers
);

router.post(
    "/",
    authMiddleware,
    controller.createDriver
);

module.exports = router;