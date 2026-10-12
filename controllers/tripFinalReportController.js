const tripFinalReportModel = require("../models/tripFinalReportModel");

const createReport = async (req, res) => {
    try {
        const {
            trip_id,
            report_no,
            final_odometer_start,
            final_odometer_end,
            total_distance_km,
            loading_date,
            unloading_date,
            remarks
        } = req.body;

        if (!trip_id || !report_no) {
            return res.status(400).json({
                success: false,
                message: "trip_id and report_no are required"
            });
        }

        const reportId = await tripFinalReportModel.createReport({
            company_id: req.user.company_id,
            trip_id,
            report_no,
            final_odometer_start,
            final_odometer_end,
            total_distance_km,
            loading_date,
            unloading_date,
            remarks,
            submitted_by: req.user.id
        });

        return res.status(201).json({
            success: true,
            message: "Trip final report submitted successfully",
            report_id: reportId
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

const getReports = async (req, res) => {
    try {
        const reports = await tripFinalReportModel.getReports(
            req.user.company_id
        );

        return res.status(200).json({
            success: true,
            reports
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

const getReportById = async (req, res) => {
    try {
        const report = await tripFinalReportModel.getReportById(
            req.params.id,
            req.user.company_id
        );

        if (!report) {
            return res.status(404).json({
                success: false,
                message: "Final report not found"
            });
        }

        return res.status(200).json({
            success: true,
            report
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

        if (!["VERIFIED", "REJECTED"].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Status must be VERIFIED or REJECTED"
            });
        }

        const updated = await tripFinalReportModel.updateStatus(
            req.params.id,
            req.user.company_id,
            status,
            req.user.id
        );

        if (!updated) {
            return res.status(404).json({
                success: false,
                message: "Final report not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: `Final report ${status.toLowerCase()} successfully`
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
    createReport,
    getReports,
    getReportById,
    updateStatus
};
