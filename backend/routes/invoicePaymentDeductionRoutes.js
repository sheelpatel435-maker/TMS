const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middleware/authMiddleware");
const controller = require("../../controllers/invoicePaymentDeductionController");

router.use(authMiddleware);

router.post("/", controller.createDeduction);
router.get("/", controller.getDeductions);
router.get("/:id", controller.getDeductionById);

module.exports = router;
