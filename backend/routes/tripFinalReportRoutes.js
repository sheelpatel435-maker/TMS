const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middleware/authMiddleware");
const requireModule = require("../../middleware/requireModule");
const controller = require("../../controllers/tripFinalReportController");

router.use(authMiddleware);

router.post("/", requireModule("Trips", "can_create"), controller.createReport);
router.get("/", requireModule("Trips", "can_view"), controller.getReports);
router.get("/:id", requireModule("Trips", "can_view"), controller.getReportById);
router.patch("/:id/status", requireModule("Trips", "can_approve"), controller.updateStatus);

module.exports = router;
