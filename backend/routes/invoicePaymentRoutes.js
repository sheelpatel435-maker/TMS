const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middleware/authMiddleware");
const requireModule = require("../../middleware/requireModule");
const controller = require("../../controllers/invoicePaymentController");

router.use(authMiddleware);

router.post("/", requireModule("Payments", "can_create"), controller.createPayment);
router.get("/", requireModule("Payments", "can_view"), controller.getPayments);
router.get("/:id", requireModule("Payments", "can_view"), controller.getPaymentById);
router.patch("/:id/status", requireModule("Payments", "can_approve"), controller.updateStatus);

module.exports = router;
