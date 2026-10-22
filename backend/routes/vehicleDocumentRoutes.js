const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middleware/authMiddleware");
const controller = require("../../controllers/vehicleDocumentController");

router.use(authMiddleware);

router.get("/", controller.getVehicleDocuments);
router.post("/", controller.createVehicleDocument);
router.get("/:vehicleId", controller.getVehicleDocuments);
router.post("/:vehicleId", controller.createVehicleDocument);

module.exports = router;
