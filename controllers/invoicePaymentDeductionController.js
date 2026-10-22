const invoicePaymentDeductionModel = require("../models/invoicePaymentDeductionModel");
const { parsePagination } = require("../utils/pagination");
const { sendError, HttpError } = require("../utils/httpError");
const { isMissing, requirePositiveAmount } = require("../utils/validation");
const { assertOwned } = require("../utils/companyScope");

const createDeduction = async (req, res) => {
    try {
        const {
            invoice_payment_id,
            deduction_type,
            amount,
            remarks
        } = req.body;

        if (isMissing(invoice_payment_id) || isMissing(deduction_type) || isMissing(amount)) {
            throw new HttpError(
                400,
                "invoice_payment_id, deduction_type and amount are required"
            );
        }

        if (!["TDS", "OTHER"].includes(deduction_type)) {
            throw new HttpError(400, "deduction_type must be TDS or OTHER");
        }

        const parsedAmount = requirePositiveAmount(amount, "amount");

        await assertOwned(
            "invoice_payments",
            invoice_payment_id,
            req.user.company_id,
            "Invoice payment"
        );

        const deductionId = await invoicePaymentDeductionModel.createDeduction({
            company_id: req.user.company_id,
            invoice_payment_id,
            deduction_type,
            amount: parsedAmount,
            remarks
        });

        return res.status(201).json({
            success: true,
            message: "Invoice payment deduction created successfully",
            deduction_id: deductionId
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const getDeductions = async (req, res) => {
    try {
        const { rows: deductions, pagination } =
            await invoicePaymentDeductionModel.getDeductions(
                req.user.company_id,
                parsePagination(req.query)
            );

        return res.status(200).json({
            success: true,
            deductions,
            pagination
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const getDeductionById = async (req, res) => {
    try {
        const deduction = await invoicePaymentDeductionModel.getDeductionById(
            req.params.id,
            req.user.company_id
        );

        if (!deduction) {
            throw new HttpError(404, "Deduction not found");
        }

        return res.status(200).json({
            success: true,
            deduction
        });
    } catch (error) {
        return sendError(res, error);
    }
};

module.exports = {
    createDeduction,
    getDeductions,
    getDeductionById
};
