const tripSettlementModel = require("../models/tripSettlementModel");

const createSettlement = async (req, res) => {
    try {
        const {
            trip_id,
            settlement_no,
            total_advance,
            total_approved_expense,
            carry_forward_in,
            net_balance,
            settlement_type,
            settlement_amount
        } = req.body;

        if (!trip_id || !settlement_no || !settlement_type) {
            return res.status(400).json({
                success: false,
                message: "trip_id, settlement_no and settlement_type are required"
            });
        }

        const settlementId =
            await tripSettlementModel.createSettlement({
                company_id: req.user.company_id,
                trip_id,
                settlement_no,
                total_advance: total_advance || 0,
                total_approved_expense: total_approved_expense || 0,
                carry_forward_in: carry_forward_in || 0,
                net_balance: net_balance || 0,
                settlement_type,
                settlement_amount: settlement_amount || 0,
                prepared_by: req.user.id
            });

        return res.status(201).json({
            success: true,
            message: "Trip settlement created successfully",
            settlement_id: settlementId
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

const getSettlements = async (req, res) => {
    try {
        const settlements =
            await tripSettlementModel.getSettlements(
                req.user.company_id
            );

        return res.status(200).json({
            success: true,
            settlements
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

const getSettlementById = async (req, res) => {
    try {
        const settlement =
            await tripSettlementModel.getSettlementById(
                req.params.id,
                req.user.company_id
            );

        if (!settlement) {
            return res.status(404).json({
                success: false,
                message: "Settlement not found"
            });
        }

        return res.status(200).json({
            success: true,
            settlement
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

        const allowedStatuses = [
            "PENDING_APPROVAL",
            "APPROVED",
            "PAID",
            "CARRIED_FORWARD",
            "CLOSED"
        ];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid settlement status"
            });
        }

        const updated =
            await tripSettlementModel.updateStatus(
                req.params.id,
                req.user.company_id,
                status,
                req.user.id
            );

        if (!updated) {
            return res.status(404).json({
                success: false,
                message: "Settlement not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Settlement status updated successfully"
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
    createSettlement,
    getSettlements,
    getSettlementById,
    updateStatus
};
