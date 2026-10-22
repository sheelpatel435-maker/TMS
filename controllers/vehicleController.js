const vehicleModel = require("../models/vehicleModel");
const { parsePagination } = require("../utils/pagination");
const { sendError, HttpError } = require("../utils/httpError");
const { isMissing } = require("../utils/validation");
const { assertOwned } = require("../utils/companyScope");

const getVehicles = async (req, res) => {
    try {
        const { rows: vehicles, pagination } = await vehicleModel.getVehicles(
            req.user.company_id,
            parsePagination(req.query)
        );

        return res.status(200).json({
            success: true,
            vehicles,
            pagination
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const createVehicle = async (req, res) => {
    try {
        const { vehicle_type_id, registration_no } = req.body;

        if (isMissing(vehicle_type_id)) {
            throw new HttpError(400, "Vehicle type is required");
        }

        if (isMissing(registration_no)) {
            throw new HttpError(400, "Registration number is required");
        }

        await assertOwned("vehicle_types", vehicle_type_id, req.user.company_id, "Vehicle type");

        const id = await vehicleModel.createVehicle(
            req.user.company_id,
            req.body
        );

        return res.status(201).json({
            success: true,
            message: "Vehicle created successfully",
            id
        });
    } catch (error) {
        return sendError(res, error);
    }
};

module.exports = {
    getVehicles,
    createVehicle
};
