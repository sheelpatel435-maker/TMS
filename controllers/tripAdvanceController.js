const tripAdvanceModel = require("../models/tripAdvanceModel");
const { parsePagination } = require("../utils/pagination");
const { sendError, HttpError } = require("../utils/httpError");
const { isMissing, requirePositiveAmount } = require("../utils/validation");
const { assertOwned, resolveCompanyId } = require("../utils/companyScope");
const { isAllowedStatus } = require("../utils/statusTransitions");
const { writeAudit } = require("../utils/audit");

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

        const companyId = resolveCompanyId(req);
        const parsedAmount = requirePositiveAmount(amount, "amount");

        await assertOwned("trips", trip_id, companyId, "Trip");

        const advanceId = await tripAdvanceModel.createAdvance({
            company_id: companyId,
            trip_id,
            amount: parsedAmount,
            payment_date: payment_date || null,
            payment_method: payment_method || null,
            reference_no: reference_no || null
        });

        await writeAudit(req, "ADVANCE_CREATED", "trip_advance", advanceId);

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
            resolveCompanyId(req),
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
            resolveCompanyId(req)
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
            resolveCompanyId(req),
            status
        );

        await writeAudit(req, "ADVANCE_STATUS_UPDATED", "trip_advance", req.params.id);

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
