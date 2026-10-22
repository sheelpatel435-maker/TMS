const tripExpenseModel = require("../models/tripExpenseModel");
const { parsePagination } = require("../utils/pagination");
const { sendError, HttpError } = require("../utils/httpError");
const {
    isMissing,
    requirePositiveAmount,
    isValidAmount
} = require("../utils/validation");
const { assertOwned } = require("../utils/companyScope");
const { isAllowedStatus } = require("../utils/statusTransitions");

const createExpense = async (req, res) => {
    try {
        const {
            trip_id,
            expense_type,
            requested_amount,
            receipt_url,
            remarks
        } = req.body;

        if (isMissing(trip_id) || isMissing(expense_type) || isMissing(requested_amount)) {
            throw new HttpError(
                400,
                "trip_id, expense_type and requested_amount are required"
            );
        }

        const parsedAmount = requirePositiveAmount(
            requested_amount,
            "requested_amount"
        );

        await assertOwned("trips", trip_id, req.user.company_id, "Trip");

        const expenseId = await tripExpenseModel.createExpense({
            company_id: req.user.company_id,
            trip_id,
            expense_type,
            requested_amount: parsedAmount,
            receipt_url: receipt_url || null,
            remarks: remarks || null
        });

        return res.status(201).json({
            success: true,
            message: "Trip expense created successfully",
            expense_id: expenseId
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const getExpenses = async (req, res) => {
    try {
        const { rows: expenses, pagination } = await tripExpenseModel.getExpenses(
            req.user.company_id,
            parsePagination(req.query)
        );

        return res.status(200).json({
            success: true,
            expenses,
            pagination
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const getExpenseById = async (req, res) => {
    try {
        const expense = await tripExpenseModel.getExpenseById(
            req.params.id,
            req.user.company_id
        );

        if (!expense) {
            throw new HttpError(404, "Trip expense not found");
        }

        return res.status(200).json({
            success: true,
            expense
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const updateStatus = async (req, res) => {
    try {
        const { status, approved_amount } = req.body;

        if (!isAllowedStatus("expense", status)) {
            throw new HttpError(400, "Invalid expense status");
        }

        if (
            status === "APPROVED" &&
            approved_amount != null &&
            !isValidAmount(approved_amount)
        ) {
            throw new HttpError(400, "approved_amount must be a valid amount");
        }

        await tripExpenseModel.updateStatus(
            req.params.id,
            req.user.company_id,
            status,
            approved_amount
        );

        return res.status(200).json({
            success: true,
            message: "Trip expense status updated successfully"
        });
    } catch (error) {
        return sendError(res, error);
    }
};

module.exports = {
    createExpense,
    getExpenses,
    getExpenseById,
    updateStatus
};
