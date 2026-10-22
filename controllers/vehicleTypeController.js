const vehicleTypeModel = require("../models/vehicleTypeModel");
const { parsePagination } = require("../utils/pagination");
const { sendError, HttpError } = require("../utils/httpError");
const { isMissing } = require("../utils/validation");

const getVehicleTypes = async (req, res) => {
    try {
        const { rows: vehicleTypes, pagination } =
            await vehicleTypeModel.getVehicleTypes(
                parsePagination(req.query)
            );

        return res.status(200).json({
            success: true,
            vehicleTypes,
            pagination
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const createVehicleType = async (req, res) => {
    try {
        const { name, status } = req.body;

        if (isMissing(name)) {
            throw new HttpError(400, "name is required");
        }

        const id = await vehicleTypeModel.createVehicleType(name, status);

        return res.status(201).json({
            success: true,
            message: "Vehicle type created successfully",
            id
        });
    } catch (error) {
        return sendError(res, error);
    }
};

module.exports = {
    getVehicleTypes,
    createVehicleType
};
