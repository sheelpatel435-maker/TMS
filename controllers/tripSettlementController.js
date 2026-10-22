const tripSettlementModel = require("../models/tripSettlementModel");
const { parsePagination } = require("../utils/pagination");
const { sendError, HttpError } = require("../utils/httpError");
const { isMissing } = require("../utils/validation");
const { assertOwned } = require("../utils/companyScope");
const { isAllowedStatus } = require("../utils/statusTransitions");

const createSettlement = async (req, res) => {
    try {
        const { trip_id, settlement_type, remarks, settlement_no } = req.body;

        if (isMissing(trip_id)) {
            throw new HttpError(400, "trip_id is required");
        }

        await assertOwned("trips", trip_id, req.user.company_id, "Trip");

        const totals = await tripSettlementModel.computeTotals(
            req.user.company_id,
            trip_id
        );

        const settlementId = await tripSettlementModel.createSettlement({
            company_id: req.user.company_id,
            trip_id,
            settlement_type,
            remarks: remarks || settlement_no || null
        });

        return res.status(201).json({
            success: true,
            message: "Trip settlement created successfully",
            settlement_id: settlementId,
            totals
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const getSettlements = async (req, res) => {
    try {
        const { rows: settlements, pagination } =
            await tripSettlementModel.getSettlements(
                req.user.company_id,
                parsePagination(req.query)
            );

        return res.status(200).json({
            success: true,
            settlements,
            pagination
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const getSettlementById = async (req, res) => {
    try {
        const settlement = await tripSettlementModel.getSettlementById(
            req.params.id,
            req.user.company_id
        );

        if (!settlement) {
            throw new HttpError(404, "Settlement not found");
        }

        return res.status(200).json({
            success: true,
            settlement
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const updateStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const aliases = {
            PENDING_APPROVAL: "PENDING",
            APPROVED: "SETTLED",
            PAID: "SETTLED",
            CLOSED: "SETTLED",
            CARRIED_FORWARD: "CARRY_FORWARD"
        };
        const mapped = aliases[status] || status;

        if (!isAllowedStatus("settlement", mapped)) {
            throw new HttpError(400, "Invalid settlement status");
        }

        await tripSettlementModel.updateStatus(
            req.params.id,
            req.user.company_id,
            mapped
        );

        return res.status(200).json({
            success: true,
            message: "Settlement status updated successfully"
        });
    } catch (error) {
        return sendError(res, error);
    }
};

module.exports = {
    createSettlement,
    getSettlements,
    getSettlementById,
    updateStatus
};
