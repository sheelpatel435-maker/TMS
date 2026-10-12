const invoiceModel = require("../models/invoiceModel");

const createInvoice = async (req, res) => {
    try {
        const {
            client_id,
            invoice_number,
            invoice_date,
            due_date,
            service_description,
            hsn_sac_code,
            exemption_notification,
            subtotal,
            tax_amount,
            total_amount,
            balance_amount,
            tds_amount,
            other_deduction_amount,
            net_receivable_amount,
            items
        } = req.body;

        if (!client_id || !invoice_number || !invoice_date) {
            return res.status(400).json({
                success: false,
                message: "client_id, invoice_number and invoice_date are required"
            });
        }

        const invoiceId = await invoiceModel.createInvoice({
            company_id: req.user.company_id,
            client_id,
            invoice_number,
            invoice_date,
            due_date,
            service_description,
            hsn_sac_code,
            exemption_notification,
            subtotal: subtotal || 0,
            tax_amount: tax_amount || 0,
            total_amount: total_amount || 0,
            balance_amount: balance_amount || 0,
            tds_amount: tds_amount || 0,
            other_deduction_amount: other_deduction_amount || 0,
            net_receivable_amount: net_receivable_amount || 0,
            items,
            created_by: req.user.id
        });

        return res.status(201).json({
            success: true,
            message: "Invoice created successfully",
            invoice_id: invoiceId
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

const getInvoices = async (req, res) => {
    try {
        const invoices = await invoiceModel.getInvoices(
            req.user.company_id
        );

        return res.status(200).json({
            success: true,
            invoices
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

const getInvoiceById = async (req, res) => {
    try {
        const invoice = await invoiceModel.getInvoiceById(
            req.params.id,
            req.user.company_id
        );

        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: "Invoice not found"
            });
        }

        return res.status(200).json({
            success: true,
            invoice
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

const updateStatus = async (req, res) => {
    try {
        const { status } = req.body;

        const allowedStatuses = [
            "DRAFT",
            "GENERATED",
            "APPROVED",
            "SENT",
            "PARTIALLY_PAID",
            "PAID",
            "OVERDUE",
            "CANCELLED"
        ];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid invoice status"
            });
        }

        const updated = await invoiceModel.updateStatus(
            req.params.id,
            req.user.company_id,
            status
        );

        if (!updated) {
            return res.status(404).json({
                success: false,
                message: "Invoice not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Invoice status updated successfully"
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

module.exports = {
    createInvoice,
    getInvoices,
    getInvoiceById,
    updateStatus
};
