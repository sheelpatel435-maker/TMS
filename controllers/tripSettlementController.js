const tripSettlementModel = require("../models/tripSettlementModel");
const tripModel = require("../models/tripModel");
const tripBalanceLedgerModel = require("../models/tripBalanceLedgerModel");
const { parsePagination } = require("../utils/pagination");
const { sendError, HttpError } = require("../utils/httpError");
const { isMissing } = require("../utils/validation");
const { assertOwned, resolveCompanyId } = require("../utils/companyScope");
const { isAllowedStatus } = require("../utils/statusTransitions");
const { writeAudit } = require("../utils/audit");
const { withTransaction } = require("../utils/transaction");

const createSettlement = async (req, res) => {
    try {
        const { trip_id, settlement_type, remarks, settlement_no } = req.body;
        const companyId = resolveCompanyId(req);

        if (isMissing(trip_id)) {
            throw new HttpError(400, "trip_id is required");
        }

        await assertOwned("trips", trip_id, companyId, "Trip");

        const totals = await tripSettlementModel.computeTotals(companyId, trip_id);

        const settlementId = await tripSettlementModel.createSettlement({
            company_id: companyId,
            trip_id,
            settlement_type,
            remarks: remarks || settlement_no || null
        });

        await writeAudit(req, "SETTLEMENT_CREATED", "trip_settlement", settlementId);

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
                resolveCompanyId(req),
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
            resolveCompanyId(req)
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
        const companyId = resolveCompanyId(req);

        if (!isAllowedStatus("settlement", mapped)) {
            throw new HttpError(400, "Invalid settlement status");
        }

        const settlement = await tripSettlementModel.getSettlementById(
            req.params.id,
            companyId
        );

        if (!settlement) {
            throw new HttpError(404, "Settlement not found");
        }

        await withTransaction(async (connection) => {
            await tripSettlementModel.updateStatus(
                req.params.id,
                companyId,
                mapped
            );

            if (mapped === "CARRY_FORWARD") {
                const trip = await tripModel.getTripById(
                    settlement.trip_id,
                    companyId
                );
                const balance = Number(settlement.balance_amount) || 0;
                const entryType = balance >= 0 ? "CARRY_FORWARD" : "DEBIT";

                await tripBalanceLedgerModel.createEntry(
                    {
                        company_id: companyId,
                        trip_id: settlement.trip_id,
                        driver_id: trip?.driver_id || null,
                        settlement_id: settlement.id,
                        entry_type: entryType,
                        amount: Math.abs(balance),
                        remarks: settlement.remarks || "Carry forward from settlement",
                        created_by: req.user.id
                    },
                    connection
                );
            }
        });

        await writeAudit(req, "SETTLEMENT_STATUS_UPDATED", "trip_settlement", req.params.id);

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
