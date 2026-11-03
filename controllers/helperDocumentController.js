const helperDocumentModel = require("../models/helperDocumentModel");
const { parsePagination } = require("../utils/pagination");
const { sendError, HttpError } = require("../utils/httpError");
const { isMissing, firstPresent } = require("../utils/validation");
const { assertOwned, resolveCompanyId } = require("../utils/companyScope");
const { publicFileUrl } = require("../middleware/upload");
const { writeAudit } = require("../utils/audit");

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
            await assertOwned("helpers", helperId, resolveCompanyId(req), "Helper");
        }

        const { rows: documents, pagination } =
            await helperDocumentModel.getHelperDocuments(
                resolveCompanyId(req),
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

        const companyId = resolveCompanyId(req);
        await assertOwned("helpers", helperId, companyId, "Helper");

        if (req.file) {
            req.body.document_url = publicFileUrl(req.file.filename);
        }

        const id = await helperDocumentModel.createHelperDocument(
            companyId,
            helperId,
            req.body
        );
        await writeAudit(req, "HELPER_DOCUMENT_CREATED", "helper_document", id);

        return res.status(201).json({
            success: true,
            message: "Helper document created successfully",
            id
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const updateHelperDocument = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const existing = await helperDocumentModel.getHelperDocumentById(
            req.params.id,
            companyId
        );

        if (!existing) {
            throw new HttpError(404, "Helper document not found");
        }

        if (isMissing(req.body.document_type)) {
            throw new HttpError(400, "Document type is required");
        }

        if (req.file) {
            req.body.document_url = publicFileUrl(req.file.filename);
        } else if (isMissing(req.body.document_url)) {
            req.body.document_url = existing.document_url;
        }

        await helperDocumentModel.updateHelperDocument(
            req.params.id,
            companyId,
            req.body
        );
        await writeAudit(req, "HELPER_DOCUMENT_UPDATED", "helper_document", req.params.id);

        return res.status(200).json({
            success: true,
            message: "Helper document updated successfully"
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const deactivateHelperDocument = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const updated = await helperDocumentModel.deactivateHelperDocument(
            req.params.id,
            companyId
        );

        if (!updated) {
            throw new HttpError(404, "Helper document not found");
        }

        await writeAudit(req, "HELPER_DOCUMENT_DEACTIVATED", "helper_document", req.params.id);

        return res.status(200).json({
            success: true,
            message: "Helper document deactivated successfully"
        });
    } catch (error) {
        return sendError(res, error);
    }
};

module.exports = {
    getHelperDocuments,
    createHelperDocument,
    updateHelperDocument,
    deactivateHelperDocument
};
