const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const controller = require("../controllers/tripSettlementController");

router.use(authMiddleware);

router.post("/", controller.createSettlement);

router.get("/", controller.getSettlements);

router.get("/:id", controller.getSettlementById);

router.patch("/:id/status", controller.updateStatus);

module.exports = router;
