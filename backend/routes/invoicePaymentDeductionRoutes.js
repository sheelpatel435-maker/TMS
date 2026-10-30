const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middleware/authMiddleware");
const requireModule = require("../../middleware/requireModule");
const controller = require("../../controllers/invoicePaymentDeductionController");

router.use(authMiddleware);

router.post("/", requireModule("Payments", "can_create"), controller.createDeduction);
router.get("/", requireModule("Payments", "can_view"), controller.getDeductions);
router.get("/:id", requireModule("Payments", "can_view"), controller.getDeductionById);

module.exports = router;
