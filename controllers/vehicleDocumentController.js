const vehicleDocumentModel = require("../models/vehicleDocumentModel");
const { parsePagination } = require("../utils/pagination");
const { sendError, HttpError } = require("../utils/httpError");
const { isMissing, firstPresent } = require("../utils/validation");
const { assertOwned } = require("../utils/companyScope");

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
            await assertOwned("vehicles", vehicleId, req.user.company_id, "Vehicle");
        }

        const { rows: documents, pagination } =
            await vehicleDocumentModel.getVehicleDocuments(
                req.user.company_id,
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

        await assertOwned("vehicles", vehicleId, req.user.company_id, "Vehicle");

        const id = await vehicleDocumentModel.createVehicleDocument(
            req.user.company_id,
            vehicleId,
            req.body
        );

        return res.status(201).json({
            success: true,
            message: "Vehicle document created successfully",
            id
        });
    } catch (error) {
        return sendError(res, error);
    }
};

module.exports = {
    getVehicleDocuments,
    createVehicleDocument
};
