const driverDocumentModel = require("../models/driverDocumentModel");
const { parsePagination } = require("../utils/pagination");
const { sendError, HttpError } = require("../utils/httpError");
const { isMissing, firstPresent } = require("../utils/validation");
const { assertOwned } = require("../utils/companyScope");

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
            await assertOwned("drivers", driverId, req.user.company_id, "Driver");
        }

        const { rows: documents, pagination } =
            await driverDocumentModel.getDriverDocuments(
                req.user.company_id,
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

        await assertOwned("drivers", driverId, req.user.company_id, "Driver");

        const id = await driverDocumentModel.createDriverDocument(
            req.user.company_id,
            driverId,
            req.body
        );

        return res.status(201).json({
            success: true,
            message: "Driver document created successfully",
            id
        });
    } catch (error) {
        return sendError(res, error);
    }
};

module.exports = {
    getDriverDocuments,
    createDriverDocument
};
