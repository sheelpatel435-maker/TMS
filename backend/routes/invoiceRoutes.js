const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middleware/authMiddleware");
const requireModule = require("../../middleware/requireModule");
const controller = require("../../controllers/invoiceController");

router.use(authMiddleware);

router.post("/", requireModule("Invoices", "can_create"), controller.createInvoice);
router.get("/", requireModule("Invoices", "can_view"), controller.getInvoices);
router.get("/:id/print", requireModule("Invoices", "can_view"), controller.printInvoice);
router.get(
    "/:id/delivery-logs",
    requireModule("Invoices", "can_view"),
    controller.getDeliveryLogs
);
router.get("/:id", requireModule("Invoices", "can_view"), controller.getInvoiceById);
router.put("/:id", requireModule("Invoices", "can_update"), controller.updateInvoice);
router.delete("/:id", requireModule("Invoices", "can_delete"), controller.deactivateInvoice);
router.patch("/:id/status", requireModule("Invoices", "can_approve"), controller.updateStatus);
router.post(
    "/:id/approve",
    requireModule("Invoices", "can_approve"),
    controller.approveInvoice
);
router.post(
    "/:id/pdf",
    requireModule("Invoices", "can_update"),
    controller.generatePdf
);
router.post(
    "/:id/email",
    requireModule("Invoices", "can_update"),
    controller.emailInvoice
);

module.exports = router;
