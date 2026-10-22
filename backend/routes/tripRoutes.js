const express = require("express");
const router = express.Router();

const controller = require("../../controllers/tripController");
const authMiddleware = require("../../middleware/authMiddleware");

router.get("/", authMiddleware, controller.getTrips);

router.post("/", authMiddleware, controller.createTrip);

module.exports = router;
