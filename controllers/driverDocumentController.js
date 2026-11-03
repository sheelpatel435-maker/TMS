const driverDocumentModel = require("../models/driverDocumentModel");
const { parsePagination } = require("../utils/pagination");
const { sendError, HttpError } = require("../utils/httpError");
const { isMissing, firstPresent } = require("../utils/validation");
const { assertOwned, resolveCompanyId } = require("../utils/companyScope");
const { publicFileUrl } = require("../middleware/upload");
const { writeAudit } = require("../utils/audit");

const resolveDriverId = (req) =>
    firstPresent(
        req.params?.driverId,
        req.body?.driver_id,
        req.query?.driver_id
    );

const getDriverDocuments = async (req, res) => {
    try {
        const driverId = resolveDriverId(req);

        if (driverId) {
            await assertOwned("drivers", driverId, resolveCompanyId(req), "Driver");
        }

        const { rows: documents, pagination } =
            await driverDocumentModel.getDriverDocuments(
                resolveCompanyId(req),
                driverId || null,
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

const createDriverDocument = async (req, res) => {
    try {
        const driverId = resolveDriverId(req);
        const { document_type } = req.body;

        if (isMissing(driverId)) {
            throw new HttpError(400, "driverId is required");
        }

        if (isMissing(document_type)) {
            throw new HttpError(400, "Document type is required");
        }

        const companyId = resolveCompanyId(req);
        await assertOwned("drivers", driverId, companyId, "Driver");

        if (req.file) {
            req.body.document_url = publicFileUrl(req.file.filename);
        }

        const id = await driverDocumentModel.createDriverDocument(
            companyId,
            driverId,
            req.body
        );
        await writeAudit(req, "DRIVER_DOCUMENT_CREATED", "driver_document", id);

        return res.status(201).json({
            success: true,
            message: "Driver document created successfully",
            id
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const updateDriverDocument = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const existing = await driverDocumentModel.getDriverDocumentById(
            req.params.id,
            companyId
        );

        if (!existing) {
            throw new HttpError(404, "Driver document not found");
        }

        if (isMissing(req.body.document_type)) {
            throw new HttpError(400, "Document type is required");
        }

        if (req.file) {
            req.body.document_url = publicFileUrl(req.file.filename);
        } else if (isMissing(req.body.document_url)) {
            req.body.document_url = existing.document_url;
        }

        await driverDocumentModel.updateDriverDocument(
            req.params.id,
            companyId,
            req.body
        );
        await writeAudit(req, "DRIVER_DOCUMENT_UPDATED", "driver_document", req.params.id);

        return res.status(200).json({
            success: true,
            message: "Driver document updated successfully"
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const deactivateDriverDocument = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const updated = await driverDocumentModel.deactivateDriverDocument(
            req.params.id,
            companyId
        );

        if (!updated) {
            throw new HttpError(404, "Driver document not found");
        }

        await writeAudit(req, "DRIVER_DOCUMENT_DEACTIVATED", "driver_document", req.params.id);

        return res.status(200).json({
            success: true,
            message: "Driver document deactivated successfully"
        });
    } catch (error) {
        return sendError(res, error);
    }
};

module.exports = {
    getDriverDocuments,
    createDriverDocument,
    updateDriverDocument,
    deactivateDriverDocument
};
