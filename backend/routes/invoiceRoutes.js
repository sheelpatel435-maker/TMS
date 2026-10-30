const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middleware/authMiddleware");
const requireModule = require("../../middleware/requireModule");
const controller = require("../../controllers/invoiceController");

router.use(authMiddleware);

router.post("/", requireModule("Invoices", "can_create"), controller.createInvoice);
router.get("/", requireModule("Invoices", "can_view"), controller.getInvoices);
router.get("/:id/print", requireModule("Invoices", "can_view"), controller.printInvoice);
router.get("/:id", requireModule("Invoices", "can_view"), controller.getInvoiceById);
router.patch("/:id/status", requireModule("Invoices", "can_approve"), controller.updateStatus);

module.exports = router;
