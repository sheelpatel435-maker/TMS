const vehicleAssignmentModel = require("../models/vehicleAssignmentModel");
const { parsePagination } = require("../utils/pagination");
const { sendError, HttpError } = require("../utils/httpError");
const { assertOwned, resolveCompanyId } = require("../utils/companyScope");
const { parseListFilters } = require("../utils/queryFilters");
const { writeAudit } = require("../utils/audit");
const { withTransaction } = require("../utils/transaction");
const {
    positiveInteger,
    isoDate,
    optionalBoolean
} = require("../utils/vehicleValidation");

const isPastDate = (value) => value < new Date().toISOString().slice(0, 10);

const getVehicleAssignments = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const { rows: assignments, pagination } =
            await vehicleAssignmentModel.getVehicleAssignments(
                companyId,
                parsePagination(req.query),
                parseListFilters(req.query)
            );

        return res.status(200).json({ success: true, assignments, pagination });
    } catch (error) {
        return sendError(res, error);
    }
};

const getAssignmentById = async (req, res) => {
    try {
        const id = positiveInteger(req.params.id, "id");
        const assignment = await vehicleAssignmentModel.getAssignmentById(
            id,
            resolveCompanyId(req)
        );
        if (!assignment) throw new HttpError(404, "Assignment not found");
        return res.status(200).json({ success: true, assignment });
    } catch (error) {
        return sendError(res, error);
    }
};

const normalizeAssignment = (body) => {
    const vehicle_id = positiveInteger(body.vehicle_id, "vehicle_id");
    const driver_id = body.driver_id ? positiveInteger(body.driver_id, "driver_id") : null;
    const helper_id = body.helper_id ? positiveInteger(body.helper_id, "helper_id") : null;
    if (!driver_id && !helper_id) {
        throw new HttpError(400, "driver_id or helper_id is required");
    }
    const start_date = isoDate(body.start_date, "start_date", false);
    const end_date = isoDate(body.end_date, "end_date");
    if (end_date && end_date < start_date) {
        throw new HttpError(400, "end_date must be on or after start_date");
    }
    const is_active = optionalBoolean(body.is_active, "is_active", 1);
    return { vehicle_id, driver_id, helper_id, start_date, end_date, is_active };
};

const createVehicleAssignment = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const data = normalizeAssignment(req.body);
        await assertOwned("vehicles", data.vehicle_id, companyId, "Vehicle");
        await assertOwned("drivers", data.driver_id, companyId, "Driver");
        await assertOwned("helpers", data.helper_id, companyId, "Helper");

        const activeFlag = data.end_date && isPastDate(data.end_date) ? 0 : data.is_active;
        const id = await withTransaction(async (connection) => {
            await vehicleAssignmentModel.lockAssignmentResources(
                companyId,
                { ...data, is_active: activeFlag },
                connection
            );
            if (activeFlag === 1) {
                const overlap = await vehicleAssignmentModel.findOverlap(
                    companyId,
                    data,
                    null,
                    connection
                );
                if (overlap) {
                    throw new HttpError(
                        409,
                        "Vehicle, driver, or helper already has an overlapping active assignment"
                    );
                }
            }
            const createdId = await vehicleAssignmentModel.createVehicleAssignment(
                companyId,
                { ...data, is_active: activeFlag },
                connection
            );
            await writeAudit(
                req,
                "ASSIGNMENT_CREATED",
                "vehicle_assignment",
                createdId,
                undefined,
                { companyId, connection, required: true }
            );
            return createdId;
        });

        return res.status(201).json({
            success: true,
            message: "Vehicle assignment created successfully",
            id
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const updateVehicleAssignment = async (_req, res) =>
    res.status(409).json({
        success: false,
        message: "Assignment history cannot be overwritten; close it and create a new assignment"
    });

const close = async (req, res, action, message) => {
    try {
        const id = positiveInteger(req.params.id, "id");
        const companyId = resolveCompanyId(req);
        const endDate = isoDate(
            req.body?.end_date || new Date().toISOString().slice(0, 10),
            "end_date",
            false
        );
        const existing = await vehicleAssignmentModel.getAssignmentById(id, companyId);
        if (!existing) throw new HttpError(404, "Assignment not found");
        if (endDate < String(existing.start_date).slice(0, 10)) {
            throw new HttpError(400, "end_date must be on or after start_date");
        }

        await withTransaction(async (connection) => {
            const updated = await vehicleAssignmentModel.closeAssignment(
                id,
                companyId,
                endDate,
                connection
            );
            if (!updated) throw new HttpError(404, "Assignment not found");
            await writeAudit(
                req,
                action,
                "vehicle_assignment",
                id,
                undefined,
                { companyId, connection, required: true }
            );
        });

        return res.status(200).json({ success: true, message });
    } catch (error) {
        return sendError(res, error);
    }
};

const deactivateVehicleAssignment = (req, res) =>
    close(req, res, "ASSIGNMENT_DEACTIVATED", "Vehicle assignment deactivated successfully");

const closeVehicleAssignment = (req, res) =>
    close(req, res, "ASSIGNMENT_CLOSED", "Vehicle assignment closed successfully");

module.exports = {
    getVehicleAssignments,
    getAssignmentById,
    createVehicleAssignment,
    updateVehicleAssignment,
    deactivateVehicleAssignment,
    closeVehicleAssignment
};
