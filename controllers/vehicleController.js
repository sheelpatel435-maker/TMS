const vehicleModel = require("../models/vehicleModel");
const { parsePagination } = require("../utils/pagination");
const { sendError, HttpError } = require("../utils/httpError");
const { isMissing } = require("../utils/validation");
const { assertOwned, resolveCompanyId } = require("../utils/companyScope");
const { parseListFilters } = require("../utils/queryFilters");
const { writeAudit } = require("../utils/audit");

const getVehicles = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const { rows: vehicles, pagination } = await vehicleModel.getVehicles(
            companyId,
            parsePagination(req.query),
            parseListFilters(req.query)
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

const getVehicleById = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const vehicle = await vehicleModel.getVehicleById(req.params.id, companyId);

        if (!vehicle) {
            throw new HttpError(404, "Vehicle not found");
        }

        return res.status(200).json({
            success: true,
            vehicle
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const createVehicle = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const { vehicle_type_id, registration_no } = req.body;

        if (isMissing(vehicle_type_id)) {
            throw new HttpError(400, "Vehicle type is required");
        }

        if (isMissing(registration_no)) {
            throw new HttpError(400, "Registration number is required");
        }

        await assertOwned("vehicle_types", vehicle_type_id, companyId, "Vehicle type");

        const id = await vehicleModel.createVehicle(companyId, req.body);
        await writeAudit(req, "VEHICLE_CREATED", "vehicle", id);

        return res.status(201).json({
            success: true,
            message: "Vehicle created successfully",
            id
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const updateVehicle = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const { vehicle_type_id, registration_no } = req.body;

        if (isMissing(vehicle_type_id) || isMissing(registration_no)) {
            throw new HttpError(400, "Vehicle type and registration number are required");
        }

        await assertOwned("vehicle_types", vehicle_type_id, companyId, "Vehicle type");

        const updated = await vehicleModel.updateVehicle(
            req.params.id,
            companyId,
            req.body
        );

        if (!updated) {
            throw new HttpError(404, "Vehicle not found");
        }

        await writeAudit(req, "VEHICLE_UPDATED", "vehicle", req.params.id);

        return res.status(200).json({
            success: true,
            message: "Vehicle updated successfully"
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const deactivateVehicle = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const updated = await vehicleModel.deactivateVehicle(req.params.id, companyId);

        if (!updated) {
            throw new HttpError(404, "Vehicle not found");
        }

        await writeAudit(req, "VEHICLE_DEACTIVATED", "vehicle", req.params.id);

        return res.status(200).json({
            success: true,
            message: "Vehicle deactivated successfully"
        });
    } catch (error) {
        return sendError(res, error);
    }
};

module.exports = {
    getVehicles,
    getVehicleById,
    createVehicle,
    updateVehicle,
    deactivateVehicle
};
