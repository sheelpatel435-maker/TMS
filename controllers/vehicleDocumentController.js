const vehicleDocumentModel = require("../models/vehicleDocumentModel");
const { parsePagination } = require("../utils/pagination");
const { sendError, HttpError } = require("../utils/httpError");
const { isMissing, firstPresent } = require("../utils/validation");
const { assertOwned, resolveCompanyId } = require("../utils/companyScope");
const { publicFileUrl } = require("../middleware/upload");
const { writeAudit } = require("../utils/audit");

const resolveVehicleId = (req) =>
    firstPresent(
        req.params?.vehicleId,
        req.body?.vehicle_id,
        req.query?.vehicle_id,
        req.query?.vehicleId
    );

const getVehicleDocuments = async (req, res) => {
    try {
        const vehicleId = resolveVehicleId(req);

        if (vehicleId) {
            await assertOwned("vehicles", vehicleId, resolveCompanyId(req), "Vehicle");
        }

        const { rows: documents, pagination } =
            await vehicleDocumentModel.getVehicleDocuments(
                resolveCompanyId(req),
                vehicleId || null,
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

const createVehicleDocument = async (req, res) => {
    try {
        const vehicleId = resolveVehicleId(req);
        const { document_type } = req.body;

        if (isMissing(vehicleId)) {
            throw new HttpError(400, "vehicleId is required");
        }

        if (isMissing(document_type)) {
            throw new HttpError(400, "Document type is required");
        }

        const companyId = resolveCompanyId(req);
        await assertOwned("vehicles", vehicleId, companyId, "Vehicle");

        if (req.file) {
            req.body.document_url = publicFileUrl(req.file.filename);
        }

        const id = await vehicleDocumentModel.createVehicleDocument(
            companyId,
            vehicleId,
            req.body
        );
        await writeAudit(req, "VEHICLE_DOCUMENT_CREATED", "vehicle_document", id);

        return res.status(201).json({
            success: true,
            message: "Vehicle document created successfully",
            id
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const updateVehicleDocument = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const existing = await vehicleDocumentModel.getVehicleDocumentById(
            req.params.id,
            companyId
        );

        if (!existing) {
            throw new HttpError(404, "Vehicle document not found");
        }

        if (isMissing(req.body.document_type)) {
            throw new HttpError(400, "Document type is required");
        }

        if (req.file) {
            req.body.document_url = publicFileUrl(req.file.filename);
        } else if (isMissing(req.body.document_url)) {
            req.body.document_url = existing.document_url;
        }

        await vehicleDocumentModel.updateVehicleDocument(
            req.params.id,
            companyId,
            req.body
        );
        await writeAudit(req, "VEHICLE_DOCUMENT_UPDATED", "vehicle_document", req.params.id);

        return res.status(200).json({
            success: true,
            message: "Vehicle document updated successfully"
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const deactivateVehicleDocument = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const updated = await vehicleDocumentModel.deactivateVehicleDocument(
            req.params.id,
            companyId
        );

        if (!updated) {
            throw new HttpError(404, "Vehicle document not found");
        }

        await writeAudit(req, "VEHICLE_DOCUMENT_DEACTIVATED", "vehicle_document", req.params.id);

        return res.status(200).json({
            success: true,
            message: "Vehicle document deactivated successfully"
        });
    } catch (error) {
        return sendError(res, error);
    }
};

module.exports = {
    getVehicleDocuments,
    createVehicleDocument,
    updateVehicleDocument,
    deactivateVehicleDocument
};
