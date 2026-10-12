const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const controller = require("../controllers/invoiceController");

router.use(authMiddleware);

router.post("/", controller.createInvoice);
router.get("/", controller.getInvoices);
router.get("/:id", controller.getInvoiceById);
router.patch("/:id/status", controller.updateStatus);

module.exports = router;
