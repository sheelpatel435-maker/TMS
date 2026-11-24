const tripDocumentModel = require("../models/tripDocumentModel");
const { parsePagination } = require("../utils/pagination");
const { sendError, HttpError } = require("../utils/httpError");
const { isMissing } = require("../utils/validation");
const { assertOwned, resolveCompanyId } = require("../utils/companyScope");
const { writeAudit } = require("../utils/audit");
const { publicFileUrl, validateUploadedFile } = require("../middleware/upload");

const getTripDocuments = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const tripId = Number(req.params.tripId || req.query.trip_id);
        if (!tripId) throw new HttpError(400, "trip_id is required");

        await assertOwned("trips", tripId, companyId, "Trip");

        const { rows: documents, pagination } = await tripDocumentModel.getByTrip(
            companyId,
            tripId,
            parsePagination(req.query)
        );

        return res.status(200).json({ success: true, documents, pagination });
    } catch (error) {
        return sendError(res, error);
    }
};

const createTripDocument = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const tripId = Number(req.body.trip_id || req.params.tripId);
        const documentType = String(req.body.document_type || "").trim();

        if (!tripId || isMissing(documentType)) {
            throw new HttpError(400, "trip_id and document_type are required");
        }

        await assertOwned("trips", tripId, companyId, "Trip");
        await validateUploadedFile(req.file);

        let documentUrl = req.body.document_url || null;
        if (req.file?.filename) {
            documentUrl = publicFileUrl(req.file.filename);
        }
        if (
            typeof documentUrl !== "string" ||
            (!documentUrl.startsWith("/api/files/") && !/^https:\/\//i.test(documentUrl))
        ) {
            throw new HttpError(400, "Upload a file or provide HTTPS document_url");
        }

        const id = await tripDocumentModel.create(companyId, {
            trip_id: tripId,
            document_type: documentType.slice(0, 80),
            document_url: documentUrl,
            remarks: req.body.remarks || null,
            uploaded_by: req.user?.id || null
        });

        await writeAudit(req, "TRIP_DOCUMENT_UPLOADED", "trip_document", id);

        return res.status(201).json({
            success: true,
            message: "Trip document uploaded",
            id,
            document: await tripDocumentModel.getById(id, companyId)
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const deactivateTripDocument = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const existing = await tripDocumentModel.getById(req.params.id, companyId);
        if (!existing) throw new HttpError(404, "Trip document not found");

        const updated = await tripDocumentModel.deactivate(req.params.id, companyId);
        if (!updated) throw new HttpError(400, "Document already inactive");

        await writeAudit(req, "TRIP_DOCUMENT_DEACTIVATED", "trip_document", req.params.id);

        return res.status(200).json({
            success: true,
            message: "Trip document deactivated (soft delete)"
        });
    } catch (error) {
        return sendError(res, error);
    }
};

module.exports = {
    getTripDocuments,
    createTripDocument,
    deactivateTripDocument
};
