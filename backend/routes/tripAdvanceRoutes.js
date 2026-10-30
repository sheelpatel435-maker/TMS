const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middleware/authMiddleware");
const requireModule = require("../../middleware/requireModule");
const controller = require("../../controllers/tripAdvanceController");

router.use(authMiddleware);

router.post("/", requireModule("Trips", "can_create"), controller.createAdvance);
router.get("/", requireModule("Trips", "can_view"), controller.getAdvances);
router.get("/:id", requireModule("Trips", "can_view"), controller.getAdvanceById);
router.patch("/:id/status", requireModule("Trips", "can_approve"), controller.updateStatus);

module.exports = router;
