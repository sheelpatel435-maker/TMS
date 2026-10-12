const tripAdvanceModel = require("../models/tripAdvanceModel");

const createAdvance = async (req, res) => {
    try {
        const {
            trip_id,
            amount,
            payment_date,
            payment_method,
            reference_no
        } = req.body;

        if (!trip_id || amount === undefined) {
            return res.status(400).json({
                success: false,
                message: "trip_id and amount are required"
            });
        }

        const advanceId = await tripAdvanceModel.createAdvance({
            company_id: req.user.company_id,
            trip_id,
            amount,
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
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

const getAdvances = async (req, res) => {
    try {
        const advances = await tripAdvanceModel.getAdvances(
            req.user.company_id
        );

        return res.status(200).json({
            success: true,
            advances
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

const getAdvanceById = async (req, res) => {
    try {
        const advance = await tripAdvanceModel.getAdvanceById(
            req.params.id,
            req.user.company_id
        );

        if (!advance) {
            return res.status(404).json({
                success: false,
                message: "Trip advance not found"
            });
        }

        return res.status(200).json({
            success: true,
            advance
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

        if (!["PENDING", "APPROVED", "PAID", "CANCELLED"].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid advance status"
            });
        }

        const updated = await tripAdvanceModel.updateStatus(
            req.params.id,
            req.user.company_id,
            status
        );

        if (!updated) {
            return res.status(404).json({
                success: false,
                message: "Trip advance not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Trip advance status updated successfully"
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
    createAdvance,
    getAdvances,
    getAdvanceById,
    updateStatus
};
