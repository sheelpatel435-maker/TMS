const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middleware/authMiddleware");
const controller = require("../../controllers/invoicePaymentController");

router.use(authMiddleware);

router.post("/", controller.createPayment);
router.get("/", controller.getPayments);
router.get("/:id", controller.getPaymentById);
router.patch("/:id/status", controller.updateStatus);

module.exports = router;
