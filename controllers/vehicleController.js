const vehicleModel = require("../models/vehicleModel");
const tripModel = require("../models/tripModel");
const { parsePagination } = require("../utils/pagination");
const { sendError, HttpError } = require("../utils/httpError");
const { assertOwned, resolveCompanyId } = require("../utils/companyScope");
const { parseListFilters } = require("../utils/queryFilters");
const { writeAudit } = require("../utils/audit");
const { withTransaction } = require("../utils/transaction");
const {
    positiveInteger,
    vehicleStatus
} = require("../utils/vehicleValidation");

const validateVehicleBody = (body, defaultStatus) => {
    const vehicle_type_id = positiveInteger(body.vehicle_type_id, "vehicle_type_id");
    const registration_no =
        typeof body.registration_no === "string" ? body.registration_no.trim().toUpperCase() : "";
    const make = typeof body.make === "string" ? body.make.trim() : "";
    const model = typeof body.model === "string" ? body.model.trim() : "";
    const ownership =
        typeof body.ownership === "string" ? body.ownership.trim() : "";
    const capacity =
        body.capacity === undefined || body.capacity === null || body.capacity === ""
            ? null
            : Number(body.capacity);

    if (!registration_no || registration_no.length > 50) {
        throw new HttpError(400, "registration_no is required and must be at most 50 characters");
    }
    if (!make || make.length > 100) {
        throw new HttpError(400, "make is required and must be at most 100 characters");
    }
    if (!model || model.length > 100) {
        throw new HttpError(400, "model is required and must be at most 100 characters");
    }
    if (!ownership || ownership.length > 50) {
        throw new HttpError(400, "ownership is required and must be at most 50 characters");
    }
    if (capacity !== null && (!Number.isFinite(capacity) || capacity < 0)) {
        throw new HttpError(400, "capacity must be a non-negative number");
    }

    return {
        vehicle_type_id,
        registration_no,
        make,
        model,
        capacity,
        ownership,
        status: vehicleStatus(body.status, defaultStatus)
    };
};

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
        const id = positiveInteger(req.params.id, "id");
        const vehicle = await vehicleModel.getVehicleById(id, companyId);

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

const getVehicleTripHistory = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const id = positiveInteger(req.params.id, "id");
        const vehicle = await vehicleModel.getVehicleById(id, companyId);
        if (!vehicle) throw new HttpError(404, "Vehicle not found");

        const { rows, pagination } = await tripModel.getVehicleTripAssignmentHistory(
            companyId,
            id,
            parsePagination(req.query)
        );
        return res.status(200).json({
            success: true,
            tripAssignmentHistory: rows,
            pagination
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const createVehicle = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const data = validateVehicleBody(req.body);

        const vehicleType = await assertOwned(
            "vehicle_types",
            data.vehicle_type_id,
            companyId,
            "Vehicle type"
        );
        if (Number(vehicleType.status) !== 1) {
            throw new HttpError(400, "Vehicle type is inactive");
        }

        const id = await withTransaction(async (connection) => {
            const createdId = await vehicleModel.createVehicle(companyId, data, connection);
            await writeAudit(req, "VEHICLE_CREATED", "vehicle", createdId, undefined, {
                companyId,
                connection,
                required: true
            });
            return createdId;
        });

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
        const id = positiveInteger(req.params.id, "id");
        const existing = await vehicleModel.getVehicleById(id, companyId);
        if (!existing) throw new HttpError(404, "Vehicle not found");
        const data = validateVehicleBody(req.body, Number(existing.status));

        const vehicleType = await assertOwned(
            "vehicle_types",
            data.vehicle_type_id,
            companyId,
            "Vehicle type"
        );
        if (Number(vehicleType.status) !== 1) {
            throw new HttpError(400, "Vehicle type is inactive");
        }

        await withTransaction(async (connection) => {
            await vehicleModel.updateVehicle(id, companyId, data, connection);
            const statusChanged = Number(existing.status) !== data.status;
            await writeAudit(
                req,
                statusChanged ? "VEHICLE_STATUS_CHANGED" : "VEHICLE_UPDATED",
                "vehicle",
                id,
                undefined,
                { companyId, connection, required: true }
            );
        });

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
        const id = positiveInteger(req.params.id, "id");
        await withTransaction(async (connection) => {
            const updated = await vehicleModel.deactivateVehicle(id, companyId, connection);
            if (!updated) throw new HttpError(404, "Vehicle not found");
            await writeAudit(req, "VEHICLE_STATUS_CHANGED", "vehicle", id, "INACTIVE", {
                companyId,
                connection,
                required: true
            });
        });

        return res.status(200).json({
            success: true,
            message: "Vehicle deactivated successfully"
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const getMyAssignedVehicle = async (req, res) => {
    try {
        const vehicle = await vehicleModel.getMyAssignedVehicle(req.user);
        if (!vehicle) {
            throw new HttpError(404, "No active vehicle assignment found");
        }
        return res.status(200).json({ success: true, vehicle });
    } catch (error) {
        return sendError(res, error);
    }
};

module.exports = {
    getVehicles,
    getVehicleById,
    getVehicleTripHistory,
    getMyAssignedVehicle,
    createVehicle,
    updateVehicle,
    deactivateVehicle
};
