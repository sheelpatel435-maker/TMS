const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middleware/authMiddleware");
const requireModule = require("../../middleware/requireModule");
const controller = require("../../controllers/tripSettlementController");

router.use(authMiddleware);

router.post("/", requireModule("Trip Settlement", "can_create"), controller.createSettlement);
router.get("/", requireModule("Trip Settlement", "can_view"), controller.getSettlements);
router.get("/:id", requireModule("Trip Settlement", "can_view"), controller.getSettlementById);
router.patch("/:id/status", requireModule("Trip Settlement", "can_approve"), controller.updateStatus);

module.exports = router;
