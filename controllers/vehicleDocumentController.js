const vehicleDocumentModel = require("../models/vehicleDocumentModel");
const { parsePagination } = require("../utils/pagination");
const { sendError, HttpError } = require("../utils/httpError");
const { firstPresent } = require("../utils/validation");
const { assertOwned, resolveCompanyId } = require("../utils/companyScope");
const { publicFileUrl, validateUploadedFile } = require("../middleware/upload");
const { writeAudit } = require("../utils/audit");
const { withTransaction } = require("../utils/transaction");
const {
    positiveInteger,
    documentType,
    DOCUMENT_TYPES,
    validateDocumentDates,
    optionalBoolean
} = require("../utils/vehicleValidation");

const resolveVehicleId = (req) =>
    firstPresent(
        req.params?.vehicleId,
        req.body?.vehicle_id,
        req.query?.vehicle_id,
        req.query?.vehicleId
    );

const dateOnly = (value) => {
    if (value instanceof Date) {
        const pad = (part) => String(part).padStart(2, "0");
        return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
    }
    return typeof value === "string" ? value.slice(0, 10) : "";
};

const normalizeDocumentData = (body, existing, uploadedFilename) => {
    const type = documentType(body.document_type ?? existing?.document_type);
    const documentNumber = String(
        body.document_number ?? existing?.document_number ?? ""
    ).trim();
    if (!documentNumber || documentNumber.length > 100) {
        throw new HttpError(400, "document_number is required and must be at most 100 characters");
    }

    const issueDate = body.issue_date ?? existing?.issue_date;
    const expiryDate = body.expiry_date ?? existing?.expiry_date;
    if (!issueDate || !expiryDate) {
        throw new HttpError(400, "issue_date and expiry_date are required");
    }
    const dates = validateDocumentDates(issueDate, expiryDate);
    const documentUrl = uploadedFilename
        ? publicFileUrl(uploadedFilename)
        : body.document_url ?? existing?.document_url;
    if (
        typeof documentUrl !== "string" ||
        (!documentUrl.startsWith("/api/files/") && !/^https:\/\//i.test(documentUrl))
    ) {
        throw new HttpError(400, "A valid uploaded file or HTTPS document_url is required");
    }

    const changed =
        !existing ||
        type !== existing.document_type ||
        documentNumber !== existing.document_number ||
        documentUrl !== existing.document_url ||
        dates.issue_date !== dateOnly(existing.issue_date) ||
        dates.expiry_date !== dateOnly(existing.expiry_date);

    return {
        document_type: type,
        document_number: documentNumber,
        document_url: documentUrl,
        issue_date: dates.issue_date,
        expiry_date: dates.expiry_date,
        status: optionalBoolean(body.status, "status", Number(existing?.status ?? 1)),
        verification_status: changed
            ? "PENDING"
            : existing?.verification_status || "PENDING"
    };
};

const getVehicleDocumentTypes = async (req, res) => {
    try {
        const documentTypes = await vehicleDocumentModel.getDocumentTypes(
            resolveCompanyId(req)
        );
        return res.status(200).json({ success: true, documentTypes });
    } catch (error) {
        return sendError(res, error);
    }
};

const createVehicleDocumentType = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const name = documentType(req.body.name);
        if (DOCUMENT_TYPES.has(name)) {
            throw new HttpError(409, "This document type is already provided by the system");
        }
        const id = await vehicleDocumentModel.createDocumentType(companyId, name);
        await writeAudit(req, "VEHICLE_DOCUMENT_TYPE_CREATED", "vehicle_document_type", id);
        return res.status(201).json({
            success: true,
            message: "Vehicle document type created successfully",
            id,
            name
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const deactivateVehicleDocumentType = async (req, res) => {
    try {
        const id = positiveInteger(req.params.id, "id");
        const companyId = resolveCompanyId(req);
        const updated = await vehicleDocumentModel.deactivateDocumentType(id, companyId);
        if (!updated) throw new HttpError(404, "Vehicle document type not found");
        await writeAudit(
            req,
            "VEHICLE_DOCUMENT_TYPE_DEACTIVATED",
            "vehicle_document_type",
            id,
            undefined,
            { companyId }
        );
        return res.status(200).json({
            success: true,
            message: "Vehicle document type deactivated successfully"
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const getVehicleDocuments = async (req, res) => {
    try {
        const vehicleId = resolveVehicleId(req);
        const companyId = resolveCompanyId(req);
        if (vehicleId) {
            await assertOwned(
                "vehicles",
                positiveInteger(vehicleId, "vehicle_id"),
                companyId,
                "Vehicle"
            );
        }

        const { rows: documents, pagination } =
            await vehicleDocumentModel.getVehicleDocuments(
                companyId,
                vehicleId ? positiveInteger(vehicleId, "vehicle_id") : null,
                parsePagination(req.query)
            );

        return res.status(200).json({ success: true, documents, pagination });
    } catch (error) {
        return sendError(res, error);
    }
};

const createVehicleDocument = async (req, res) => {
    try {
        const vehicleId = positiveInteger(resolveVehicleId(req), "vehicle_id");
        const companyId = resolveCompanyId(req);
        await assertOwned("vehicles", vehicleId, companyId, "Vehicle");
        await validateUploadedFile(req.file);
        const data = normalizeDocumentData(req.body, null, req.file?.filename);
        if (
            !DOCUMENT_TYPES.has(data.document_type) &&
            !(await vehicleDocumentModel.getDocumentType(companyId, data.document_type))
        ) {
            throw new HttpError(400, "Document type is not configured for this company");
        }

        const id = await withTransaction(async (connection) => {
            const createdId = await vehicleDocumentModel.createVehicleDocument(
                companyId,
                vehicleId,
                data,
                connection
            );
            await writeAudit(
                req,
                "VEHICLE_DOCUMENT_CREATED",
                "vehicle_document",
                createdId,
                undefined,
                { companyId, connection, required: true }
            );
            return createdId;
        });

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
        const id = positiveInteger(req.params.id, "id");
        const companyId = resolveCompanyId(req);
        const existing = await vehicleDocumentModel.getVehicleDocumentById(id, companyId);
        if (!existing) throw new HttpError(404, "Vehicle document not found");
        await validateUploadedFile(req.file);
        const data = normalizeDocumentData(req.body, existing, req.file?.filename);
        if (
            !DOCUMENT_TYPES.has(data.document_type) &&
            !(await vehicleDocumentModel.getDocumentType(companyId, data.document_type))
        ) {
            throw new HttpError(400, "Document type is not configured for this company");
        }

        await withTransaction(async (connection) => {
            await vehicleDocumentModel.updateVehicleDocument(id, companyId, data, connection);
            await writeAudit(
                req,
                "VEHICLE_DOCUMENT_UPDATED",
                "vehicle_document",
                id,
                undefined,
                { companyId, connection, required: true }
            );
        });

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
        const id = positiveInteger(req.params.id, "id");
        const companyId = resolveCompanyId(req);
        await withTransaction(async (connection) => {
            const updated = await vehicleDocumentModel.deactivateVehicleDocument(
                id,
                companyId,
                connection
            );
            if (!updated) throw new HttpError(404, "Vehicle document not found");
            await writeAudit(
                req,
                "VEHICLE_DOCUMENT_DEACTIVATED",
                "vehicle_document",
                id,
                undefined,
                { companyId, connection, required: true }
            );
        });

        return res.status(200).json({
            success: true,
            message: "Vehicle document deactivated successfully"
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const verifyVehicleDocument = async (req, res) => {
    try {
        const id = positiveInteger(req.params.id, "id");
        const companyId = resolveCompanyId(req);
        const verificationStatus = String(req.body.verification_status || "").toUpperCase();
        if (!["VERIFIED", "REJECTED"].includes(verificationStatus)) {
            throw new HttpError(400, "verification_status must be VERIFIED or REJECTED");
        }

        await withTransaction(async (connection) => {
            const existing = await vehicleDocumentModel.getVehicleDocumentById(id, companyId);
            if (!existing) throw new HttpError(404, "Vehicle document not found");
            if (existing.verification_status === verificationStatus) return;
            const updated = await vehicleDocumentModel.updateVerificationStatus(
                id,
                companyId,
                verificationStatus,
                connection
            );
            if (!updated) throw new HttpError(404, "Vehicle document not found");
            await writeAudit(
                req,
                `VEHICLE_DOCUMENT_${verificationStatus}`,
                "vehicle_document",
                id,
                undefined,
                { companyId, connection, required: true }
            );
        });

        return res.status(200).json({
            success: true,
            message: `Vehicle document ${verificationStatus.toLowerCase()}`
        });
    } catch (error) {
        return sendError(res, error);
    }
};

module.exports = {
    getVehicleDocumentTypes,
    createVehicleDocumentType,
    deactivateVehicleDocumentType,
    getVehicleDocuments,
    createVehicleDocument,
    updateVehicleDocument,
    verifyVehicleDocument,
    deactivateVehicleDocument
};
