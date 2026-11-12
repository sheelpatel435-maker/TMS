const documentExpiryModel = require("../models/documentExpiryModel");
const { sendError } = require("../utils/httpError");
const { resolveCompanyId } = require("../utils/companyScope");
const { HttpError } = require("../utils/httpError");
const { parsePagination } = require("../utils/pagination");

const getExpiringDocuments = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const days = req.query.days === undefined ? 30 : Number(req.query.days);
        if (!Number.isInteger(days) || days < 0 || days > 365) {
            throw new HttpError(400, "days must be an integer between 0 and 365");
        }
        const { rows: documents, pagination } = await documentExpiryModel.getExpiringDocuments(
            companyId,
            days,
            parsePagination(req.query)
        );

        return res.status(200).json({
            success: true,
            days,
            count: pagination.total,
            pagination,
            documents
        });
    } catch (error) {
        return sendError(res, error);
    }
};

module.exports = {
    getExpiringDocuments
};
