const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const controller = require("../controllers/tripFinalReportController");

router.use(authMiddleware);

router.post("/", controller.createReport);

router.get("/", controller.getReports);

router.get("/:id", controller.getReportById);

router.patch("/:id/status", controller.updateStatus);

module.exports = router;
