const tripAdvanceModel = require("../models/tripAdvanceModel");
const { parsePagination } = require("../utils/pagination");
const { sendError, HttpError } = require("../utils/httpError");
const { isMissing, requirePositiveAmount } = require("../utils/validation");
const { assertOwned } = require("../utils/companyScope");
const { isAllowedStatus } = require("../utils/statusTransitions");

const createAdvance = async (req, res) => {
    try {
        const {
            trip_id,
            amount,
            payment_date,
            payment_method,
            reference_no
        } = req.body;

        if (isMissing(trip_id) || isMissing(amount)) {
            throw new HttpError(400, "trip_id and amount are required");
        }

        const parsedAmount = requirePositiveAmount(amount, "amount");

        await assertOwned("trips", trip_id, req.user.company_id, "Trip");

        const advanceId = await tripAdvanceModel.createAdvance({
            company_id: req.user.company_id,
            trip_id,
            amount: parsedAmount,
            payment_date: payment_date || null,
            payment_method: payment_method || null,
            reference_no: reference_no || null
        });

        return res.status(201).json({
            success: true,
            message: "Trip advance created successfully",
            advance_id: advanceId
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const getAdvances = async (req, res) => {
    try {
        const { rows: advances, pagination } = await tripAdvanceModel.getAdvances(
            req.user.company_id,
            parsePagination(req.query)
        );

        return res.status(200).json({
            success: true,
            advances,
            pagination
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const getAdvanceById = async (req, res) => {
    try {
        const advance = await tripAdvanceModel.getAdvanceById(
            req.params.id,
            req.user.company_id
        );

        if (!advance) {
            throw new HttpError(404, "Trip advance not found");
        }

        return res.status(200).json({
            success: true,
            advance
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const updateStatus = async (req, res) => {
    try {
        const { status } = req.body;

        if (!isAllowedStatus("advance", status)) {
            throw new HttpError(400, "Invalid advance status");
        }

        await tripAdvanceModel.updateStatus(
            req.params.id,
            req.user.company_id,
            status
        );

        return res.status(200).json({
            success: true,
            message: "Trip advance status updated successfully"
        });
    } catch (error) {
        return sendError(res, error);
    }
};

module.exports = {
    createAdvance,
    getAdvances,
    getAdvanceById,
    updateStatus
};
