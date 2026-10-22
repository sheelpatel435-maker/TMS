const invoicePaymentModel = require("../models/invoicePaymentModel");
const { parsePagination } = require("../utils/pagination");
const { sendError, HttpError } = require("../utils/httpError");
const {
    isMissing,
    firstPresent,
    isValidAmount,
    roundMoney,
    toNumber
} = require("../utils/validation");
const { assertOwned } = require("../utils/companyScope");
const { isAllowedStatus } = require("../utils/statusTransitions");

const createPayment = async (req, res) => {
    try {
        const {
            invoice_id,
            payment_reference,
            reference_no,
            payment_date,
            amount,
            gross_payment_amount,
            gross_amount,
            deduction_amount,
            net_received_amount,
            payment_method
        } = req.body;

        if (isMissing(invoice_id) || isMissing(payment_date) || isMissing(payment_method)) {
            throw new HttpError(
                400,
                "invoice_id, payment_date and payment_method are required"
            );
        }

        const invoice = await assertOwned(
            "invoices",
            invoice_id,
            req.user.company_id,
            "Invoice"
        );

        if (["DRAFT", "CANCELLED"].includes(invoice.status)) {
            throw new HttpError(400, "Payments cannot be added to this invoice");
        }

        const gross = firstPresent(gross_amount, gross_payment_amount, amount);

        if (!isValidAmount(gross) || toNumber(gross) <= 0) {
            throw new HttpError(400, "Payment amount must be greater than 0");
        }

        const deduction = isValidAmount(deduction_amount)
            ? roundMoney(deduction_amount)
            : 0;
        const net = isValidAmount(net_received_amount)
            ? roundMoney(net_received_amount)
            : roundMoney(toNumber(gross) - deduction);

        const paymentId = await invoicePaymentModel.createPayment({
            company_id: req.user.company_id,
            invoice_id,
            payment_date,
            gross_amount: roundMoney(gross),
            deduction_amount: deduction,
            net_received_amount: net < 0 ? 0 : net,
            payment_method,
            reference_no: firstPresent(reference_no, payment_reference)
        });

        return res.status(201).json({
            success: true,
            message: "Invoice payment created successfully",
            payment_id: paymentId
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const getPayments = async (req, res) => {
    try {
        const { rows: payments, pagination } =
            await invoicePaymentModel.getPayments(
                req.user.company_id,
                parsePagination(req.query)
            );

        return res.status(200).json({
            success: true,
            payments,
            pagination
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const getPaymentById = async (req, res) => {
    try {
        const payment = await invoicePaymentModel.getPaymentById(
            req.params.id,
            req.user.company_id
        );

        if (!payment) {
            throw new HttpError(404, "Payment not found");
        }

        return res.status(200).json({
            success: true,
            payment
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const updateStatus = async (req, res) => {
    try {
        let { status } = req.body;

        if (status === "REVERSED") {
            status = "CANCELLED";
        }

        if (!isAllowedStatus("payment", status)) {
            throw new HttpError(400, "Status must be CONFIRMED or CANCELLED");
        }

        await invoicePaymentModel.updateStatus(
            req.params.id,
            req.user.company_id,
            status
        );

        return res.status(200).json({
            success: true,
            message: "Payment status updated successfully"
        });
    } catch (error) {
        return sendError(res, error);
    }
};

module.exports = {
    createPayment,
    getPayments,
    getPaymentById,
    updateStatus
};
