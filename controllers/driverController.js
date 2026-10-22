const driverModel = require("../models/driverModel");
const driverDocumentModel = require("../models/driverDocumentModel");
const { parsePagination } = require("../utils/pagination");
const { sendError, HttpError } = require("../utils/httpError");
const { isMissing } = require("../utils/validation");

const getDrivers = async (req, res) => {
    try {
        const { rows: drivers, pagination } = await driverModel.getDrivers(
            req.user.company_id,
            parsePagination(req.query)
        );

        return res.status(200).json({
            success: true,
            drivers,
            pagination
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const createDriver = async (req, res) => {
    try {
        const { name, mobile, license_number } = req.body;

        if (isMissing(name) || isMissing(mobile)) {
            throw new HttpError(400, "Name and mobile are required");
        }

        const id = await driverModel.createDriver(
            req.user.company_id,
            req.body
        );

        if (!isMissing(license_number)) {
            await driverDocumentModel.createDriverDocument(
                req.user.company_id,
                id,
                {
                    document_type: "LICENSE",
                    document_number: license_number,
                    status: 1
                }
            );
        }

        return res.status(201).json({
            success: true,
            message: "Driver created successfully",
            id
        });
    } catch (error) {
        return sendError(res, error);
    }
};

module.exports = {
    getDrivers,
    createDriver
};
