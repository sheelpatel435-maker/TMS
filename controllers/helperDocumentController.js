const helperDocumentModel = require("../models/helperDocumentModel");
const { parsePagination } = require("../utils/pagination");
const { sendError, HttpError } = require("../utils/httpError");
const { isMissing, firstPresent } = require("../utils/validation");
const { assertOwned } = require("../utils/companyScope");

const resolveHelperId = (req) =>
    firstPresent(
        req.params?.helperId,
        req.body?.helper_id,
        req.query?.helper_id
    );

const getHelperDocuments = async (req, res) => {
    try {
        const helperId = resolveHelperId(req);

        if (helperId) {
            await assertOwned("helpers", helperId, req.user.company_id, "Helper");
        }

        const { rows: documents, pagination } =
            await helperDocumentModel.getHelperDocuments(
                req.user.company_id,
                helperId || null,
                parsePagination(req.query)
            );

        return res.status(200).json({
            success: true,
            documents,
            pagination
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const createHelperDocument = async (req, res) => {
    try {
        const helperId = resolveHelperId(req);
        const { document_type } = req.body;

        if (isMissing(helperId)) {
            throw new HttpError(400, "helperId is required");
        }

        if (isMissing(document_type)) {
            throw new HttpError(400, "Document type is required");
        }

        await assertOwned("helpers", helperId, req.user.company_id, "Helper");

        const id = await helperDocumentModel.createHelperDocument(
            req.user.company_id,
            helperId,
            req.body
        );

        return res.status(201).json({
            success: true,
            message: "Helper document created successfully",
            id
        });
    } catch (error) {
        return sendError(res, error);
    }
};

module.exports = {
    getHelperDocuments,
    createHelperDocument
};
