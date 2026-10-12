const invoicePaymentDeductionModel = require("../models/invoicePaymentDeductionModel");

const createDeduction = async (req, res) => {
    try {
        const {
            invoice_payment_id,
            deduction_type,
            deduction_rate,
            amount,
            remarks
        } = req.body;

        if (!invoice_payment_id || !deduction_type || amount === undefined) {
            return res.status(400).json({
                success: false,
                message: "invoice_payment_id, deduction_type and amount are required"
            });
        }

        if (!["TDS", "OTHER"].includes(deduction_type)) {
            return res.status(400).json({
                success: false,
                message: "deduction_type must be TDS or OTHER"
            });
        }

        const deductionId =
            await invoicePaymentDeductionModel.createDeduction({
                company_id: req.user.company_id,
                invoice_payment_id,
                deduction_type,
                deduction_rate: deduction_rate || 0,
                amount,
                remarks
            });

        return res.status(201).json({
            success: true,
            message: "Invoice payment deduction created successfully",
            deduction_id: deductionId
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

const getDeductions = async (req, res) => {
    try {
        const deductions =
            await invoicePaymentDeductionModel.getDeductions(
                req.user.company_id
            );

        return res.status(200).json({
            success: true,
            deductions
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

const getDeductionById = async (req, res) => {
    try {
        const deduction =
            await invoicePaymentDeductionModel.getDeductionById(
                req.params.id,
                req.user.company_id
            );

        if (!deduction) {
            return res.status(404).json({
                success: false,
                message: "Deduction not found"
            });
        }

        return res.status(200).json({
            success: true,
            deduction
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
    createDeduction,
    getDeductions,
    getDeductionById
};
