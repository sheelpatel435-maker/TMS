const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const controller = require("../controllers/vehicleTypeController");

router.use(authMiddleware);

router.get("/", controller.getVehicleTypes);
router.post("/", controller.createVehicleType);

module.exports = router;
