const reportModel = require("../models/reportModel");
const { sendError, HttpError } = require("../utils/httpError");
const { resolveCompanyId } = require("../utils/companyScope");

const getTripReport = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const counts = await reportModel.getTripCounts(
            companyId,
            req.query.from,
            req.query.to
        );

        return res.status(200).json({
            success: true,
            from: req.query.from || null,
            to: req.query.to || null,
            counts
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const getFinanceReport = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const summary = await reportModel.getFinanceSummary(
            companyId,
            req.query.from,
            req.query.to
        );

        return res.status(200).json({
            success: true,
            from: req.query.from || null,
            to: req.query.to || null,
            invoiced: Number(summary.invoiced),
            received: Number(summary.received),
            outstanding: Number(summary.outstanding)
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const getTripFinanceReport = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const report = await reportModel.getTripDetail(companyId, req.params.id);

        if (!report) {
            throw new HttpError(404, "Trip not found");
        }

        return res.status(200).json({
            success: true,
            report
        });
    } catch (error) {
        return sendError(res, error);
    }
};

module.exports = {
    getTripReport,
    getFinanceReport,
    getTripFinanceReport
};
