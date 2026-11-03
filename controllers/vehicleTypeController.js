const vehicleTypeModel = require("../models/vehicleTypeModel");
const { parsePagination } = require("../utils/pagination");
const { sendError, HttpError } = require("../utils/httpError");
const { isMissing } = require("../utils/validation");
const { parseListFilters } = require("../utils/queryFilters");
const { writeAudit } = require("../utils/audit");

const getVehicleTypes = async (req, res) => {
    try {
        const { rows: vehicleTypes, pagination } =
            await vehicleTypeModel.getVehicleTypes(
                parsePagination(req.query),
                parseListFilters(req.query)
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

const getVehicleTypeById = async (req, res) => {
    try {
        const vehicleType = await vehicleTypeModel.getVehicleTypeById(req.params.id);

        if (!vehicleType) {
            throw new HttpError(404, "Vehicle type not found");
        }

        return res.status(200).json({
            success: true,
            vehicleType
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
        await writeAudit(req, "VEHICLE_TYPE_CREATED", "vehicle_type", id);

        return res.status(201).json({
            success: true,
            message: "Vehicle type created successfully",
            id
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const updateVehicleType = async (req, res) => {
    try {
        const { name } = req.body;

        if (isMissing(name)) {
            throw new HttpError(400, "name is required");
        }

        const updated = await vehicleTypeModel.updateVehicleType(req.params.id, req.body);

        if (!updated) {
            throw new HttpError(404, "Vehicle type not found");
        }

        await writeAudit(req, "VEHICLE_TYPE_UPDATED", "vehicle_type", req.params.id);

        return res.status(200).json({
            success: true,
            message: "Vehicle type updated successfully"
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const deactivateVehicleType = async (req, res) => {
    try {
        const updated = await vehicleTypeModel.deactivateVehicleType(req.params.id);

        if (!updated) {
            throw new HttpError(404, "Vehicle type not found");
        }

        await writeAudit(req, "VEHICLE_TYPE_DEACTIVATED", "vehicle_type", req.params.id);

        return res.status(200).json({
            success: true,
            message: "Vehicle type deactivated successfully"
        });
    } catch (error) {
        return sendError(res, error);
    }
};

module.exports = {
    getVehicleTypes,
    getVehicleTypeById,
    createVehicleType,
    updateVehicleType,
    deactivateVehicleType
};
