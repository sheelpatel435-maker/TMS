const tripFinalReportModel = require("../models/tripFinalReportModel");
const { parsePagination } = require("../utils/pagination");
const { sendError, HttpError } = require("../utils/httpError");
const { isMissing } = require("../utils/validation");
const { assertOwned } = require("../utils/companyScope");
const { isAllowedStatus } = require("../utils/statusTransitions");

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

        if (isMissing(trip_id) || isMissing(report_no)) {
            throw new HttpError(400, "trip_id and report_no are required");
        }

        await assertOwned("trips", trip_id, req.user.company_id, "Trip");

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
        return sendError(res, error);
    }
};

const getReports = async (req, res) => {
    try {
        const { rows: reports, pagination } = await tripFinalReportModel.getReports(
            req.user.company_id,
            parsePagination(req.query)
        );

        return res.status(200).json({
            success: true,
            reports,
            pagination
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const getReportById = async (req, res) => {
    try {
        const report = await tripFinalReportModel.getReportById(
            req.params.id,
            req.user.company_id
        );

        if (!report) {
            throw new HttpError(404, "Final report not found");
        }

        return res.status(200).json({
            success: true,
            report
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const updateStatus = async (req, res) => {
    try {
        const { status } = req.body;

        if (!isAllowedStatus("finalReport", status) || status === "SUBMITTED") {
            throw new HttpError(400, "Status must be VERIFIED or REJECTED");
        }

        await tripFinalReportModel.updateStatus(
            req.params.id,
            req.user.company_id,
            status,
            req.user.id
        );

        return res.status(200).json({
            success: true,
            message: `Final report ${status.toLowerCase()} successfully`
        });
    } catch (error) {
        return sendError(res, error);
    }
};

module.exports = {
    createReport,
    getReports,
    getReportById,
    updateStatus
};
