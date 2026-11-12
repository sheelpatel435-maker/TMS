const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middleware/authMiddleware");
const { requireMobileVehicleUser } = require("../../middleware/vehicleAccess");
const controller = require("../../controllers/mobileController");

router.use(authMiddleware);
router.use(requireMobileVehicleUser);

router.get("/trips", controller.getMyTrips);
router.get("/trips/:id", controller.getMyTripById);
router.post("/expenses", controller.submitMyExpense);

module.exports = router;
