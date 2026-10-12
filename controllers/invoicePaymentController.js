const invoicePaymentModel = require("../models/invoicePaymentModel");

const createPayment = async (req, res) => {
    try {
        const {
            invoice_id,
            payment_reference,
            payment_date,
            amount,
            gross_payment_amount,
            deduction_amount,
            net_received_amount,
            payment_method,
            bank_reference,
            remarks
        } = req.body;

        if (
            !invoice_id ||
            !payment_reference ||
            !payment_date ||
            !payment_method
        ) {
            return res.status(400).json({
                success: false,
                message: "invoice_id, payment_reference, payment_date and payment_method are required"
            });
        }

        const paymentId =
            await invoicePaymentModel.createPayment({
                company_id: req.user.company_id,
                invoice_id,
                payment_reference,
                payment_date,
                amount: amount || 0,
                gross_payment_amount: gross_payment_amount || 0,
                deduction_amount: deduction_amount || 0,
                net_received_amount: net_received_amount || 0,
                payment_method,
                bank_reference,
                remarks
            });

        return res.status(201).json({
            success: true,
            message: "Invoice payment created successfully",
            payment_id: paymentId
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

const getPayments = async (req, res) => {
    try {
        const payments =
            await invoicePaymentModel.getPayments(
                req.user.company_id
            );

        return res.status(200).json({
            success: true,
            payments
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

const getPaymentById = async (req, res) => {
    try {
        const payment =
            await invoicePaymentModel.getPaymentById(
                req.params.id,
                req.user.company_id
            );

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: "Payment not found"
            });
        }

        return res.status(200).json({
            success: true,
            payment
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

        if (!["CONFIRMED", "REVERSED"].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Status must be CONFIRMED or REVERSED"
            });
        }

        const updated =
            await invoicePaymentModel.updateStatus(
                req.params.id,
                req.user.company_id,
                status,
                req.user.id
            );

        if (!updated) {
            return res.status(404).json({
                success: false,
                message: "Payment not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Payment status updated successfully"
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
    createPayment,
    getPayments,
    getPaymentById,
    updateStatus
};
