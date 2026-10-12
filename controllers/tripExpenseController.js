const tripExpenseModel = require("../models/tripExpenseModel");

const createExpense = async (req, res) => {
    try {
        const {
            trip_id,
            expense_type,
            requested_amount,
            approved_amount,
            receipt_url,
            remarks
        } = req.body;

        if (
            !trip_id ||
            !expense_type ||
            requested_amount === undefined
        ) {
            return res.status(400).json({
                success: false,
                message: "trip_id, expense_type and requested_amount are required"
            });
        }

        const expenseId = await tripExpenseModel.createExpense({
            company_id: req.user.company_id,
            trip_id,
            expense_type,
            requested_amount,
            approved_amount: approved_amount || null,
            receipt_url: receipt_url || null,
            remarks: remarks || null
        });

        return res.status(201).json({
            success: true,
            message: "Trip expense created successfully",
            expense_id: expenseId
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

const getExpenses = async (req, res) => {
    try {
        const expenses = await tripExpenseModel.getExpenses(
            req.user.company_id
        );

        return res.status(200).json({
            success: true,
            expenses
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

const getExpenseById = async (req, res) => {
    try {
        const expense = await tripExpenseModel.getExpenseById(
            req.params.id,
            req.user.company_id
        );

        if (!expense) {
            return res.status(404).json({
                success: false,
                message: "Trip expense not found"
            });
        }

        return res.status(200).json({
            success: true,
            expense
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
        const {
            status,
            approved_amount
        } = req.body;

        if (!["PENDING", "APPROVED", "REJECTED"].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid expense status"
            });
        }

        const updated = await tripExpenseModel.updateStatus(
            req.params.id,
            req.user.company_id,
            status,
            approved_amount || 0
        );

        if (!updated) {
            return res.status(404).json({
                success: false,
                message: "Trip expense not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Trip expense status updated successfully"
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
    createExpense,
    getExpenses,
    getExpenseById,
    updateStatus
};
