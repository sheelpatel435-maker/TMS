const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middleware/authMiddleware");
const { requireMobileVehicleUser } = require("../../middleware/vehicleAccess");
const { upload } = require("../../middleware/upload");
const controller = require("../../controllers/mobileController");

router.use(authMiddleware);
router.use(requireMobileVehicleUser);

// BRD §17 — Driver/Helper mobile
router.get("/me", controller.getMyProfile);
router.get("/vehicle", controller.getMyVehicle);
router.get("/vehicle/documents", controller.getMyVehicleDocuments);

router.get("/trips", controller.getMyTrips);
router.get("/trips/:id", controller.getMyTripById);
router.get("/trips/:id/settlement", controller.getMyTripSettlement);

router.get("/expense-types", controller.getMyExpenseTypes);
router.get("/expenses", controller.getMyExpenses);
router.post("/expenses", upload.single("file"), controller.submitMyExpense);

module.exports = router;
