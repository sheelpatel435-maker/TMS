const documentExpiryModel = require("../models/documentExpiryModel");
const { sendError } = require("../utils/httpError");
const { resolveCompanyId } = require("../utils/companyScope");

const getExpiringDocuments = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const days = Number(req.query.days) || 30;
        const documents = await documentExpiryModel.getExpiringDocuments(
            companyId,
            days
        );

        return res.status(200).json({
            success: true,
            days,
            count: documents.length,
            documents
        });
    } catch (error) {
        return sendError(res, error);
    }
};

module.exports = {
    getExpiringDocuments
};
