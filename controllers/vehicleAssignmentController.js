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

const parseAssignmentFilters = (query = {}) => {
    const filters = parseListFilters(query);
    if (query.vehicle_id) filters.vehicle_id = query.vehicle_id;
    if (query.driver_id) filters.driver_id = query.driver_id;
    if (query.helper_id) filters.helper_id = query.helper_id;
    if (query.assignment_role || query.role) {
        filters.assignment_role = query.assignment_role || query.role;
    }
    if (
        query.include_inactive === "1" ||
        query.include_inactive === "true" ||
        query.history === "1" ||
        query.history === "true"
    ) {
        filters.include_inactive = true;
    }
    return filters;
};

/**
 * Driver and helper must be separate assignment rows.
 * Body:
 *  - assignment_role: DRIVER | HELPER (optional if only one person id sent)
 *  - DRIVER => driver_id required, helper_id must be empty
 *  - HELPER => helper_id required, driver_id must be empty
 */
const normalizeAssignment = (body, existing = null) => {
    const vehicle_id = positiveInteger(
        body.vehicle_id ?? existing?.vehicle_id,
        "vehicle_id"
    );

    let role = String(
        body.assignment_role ?? body.role ?? existing?.assignment_role ?? ""
    )
        .trim()
        .toUpperCase();

    const hasDriver =
        body.driver_id !== undefined
            ? body.driver_id !== null && body.driver_id !== ""
            : existing?.driver_id != null;
    const hasHelper =
        body.helper_id !== undefined
            ? body.helper_id !== null && body.helper_id !== ""
            : existing?.helper_id != null;

    if (!role) {
        if (hasDriver && !hasHelper) role = "DRIVER";
        else if (hasHelper && !hasDriver) role = "HELPER";
    }

    if (!["DRIVER", "HELPER"].includes(role)) {
        throw new HttpError(
            400,
            "assignment_role must be DRIVER or HELPER (separate assignments)"
        );
    }

    let driver_id = null;
    let helper_id = null;

    if (role === "DRIVER") {
        const raw =
            body.driver_id !== undefined ? body.driver_id : existing?.driver_id;
        driver_id = positiveInteger(raw, "driver_id");
        if (
            body.helper_id !== undefined &&
            body.helper_id !== null &&
            body.helper_id !== ""
        ) {
            throw new HttpError(
                400,
                "HELPER cannot be set on a DRIVER assignment; create a separate HELPER assignment"
            );
        }
    } else {
        const raw =
            body.helper_id !== undefined ? body.helper_id : existing?.helper_id;
        helper_id = positiveInteger(raw, "helper_id");
        if (
            body.driver_id !== undefined &&
            body.driver_id !== null &&
            body.driver_id !== ""
        ) {
            throw new HttpError(
                400,
                "DRIVER cannot be set on a HELPER assignment; create a separate DRIVER assignment"
            );
        }
    }

    const start_date = isoDate(
        body.start_date ?? existing?.start_date,
        "start_date",
        false
    );
    const end_date = isoDate(
        body.end_date !== undefined ? body.end_date : existing?.end_date,
        "end_date"
    );
    if (end_date && end_date < start_date) {
        throw new HttpError(400, "end_date must be on or after start_date");
    }

    const is_active = optionalBoolean(
        body.is_active !== undefined ? body.is_active : existing?.is_active,
        "is_active",
        1
    );

    return {
        vehicle_id,
        assignment_role: role,
        driver_id,
        helper_id,
        start_date,
        end_date,
        is_active
    };
};

const getVehicleAssignments = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const { rows: assignments, pagination } =
            await vehicleAssignmentModel.getVehicleAssignments(
                companyId,
                parsePagination(req.query),
                parseAssignmentFilters(req.query)
            );

        return res.status(200).json({ success: true, assignments, pagination });
    } catch (error) {
        return sendError(res, error);
    }
};

/** Full history (active + closed) for vehicle / driver / helper */
const getAssignmentHistory = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const filters = parseAssignmentFilters({
            ...req.query,
            include_inactive: "1"
        });
        // Clear status so closed rows are included
        delete filters.status;

        const { rows: assignments, pagination } =
            await vehicleAssignmentModel.getVehicleAssignments(
                companyId,
                parsePagination(req.query),
                filters
            );

        return res.status(200).json({
            success: true,
            history: assignments,
            assignments,
            pagination
        });
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

const createVehicleAssignment = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const data = normalizeAssignment(req.body);
        await assertOwned("vehicles", data.vehicle_id, companyId, "Vehicle");
        if (data.assignment_role === "DRIVER") {
            await assertOwned("drivers", data.driver_id, companyId, "Driver");
        } else {
            await assertOwned("helpers", data.helper_id, companyId, "Helper");
        }

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
                        `${data.assignment_role} already has an overlapping active assignment for this vehicle or person`
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
                JSON.stringify(data),
                { companyId, connection, required: true }
            );
            return createdId;
        });

        return res.status(201).json({
            success: true,
            message: `${data.assignment_role} assignment created successfully`,
            id
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const updateVehicleAssignment = async (req, res) => {
    try {
        const id = positiveInteger(req.params.id, "id");
        const companyId = resolveCompanyId(req);
        const existing = await vehicleAssignmentModel.getAssignmentById(id, companyId);
        if (!existing) throw new HttpError(404, "Assignment not found");

        const data = normalizeAssignment(req.body, existing);
        await assertOwned("vehicles", data.vehicle_id, companyId, "Vehicle");
        if (data.assignment_role === "DRIVER") {
            await assertOwned("drivers", data.driver_id, companyId, "Driver");
        } else {
            await assertOwned("helpers", data.helper_id, companyId, "Helper");
        }

        const activeFlag = data.end_date && isPastDate(data.end_date) ? 0 : data.is_active;

        await withTransaction(async (connection) => {
            await vehicleAssignmentModel.lockAssignmentResources(
                companyId,
                { ...data, is_active: activeFlag },
                connection
            );
            if (activeFlag === 1) {
                const overlap = await vehicleAssignmentModel.findOverlap(
                    companyId,
                    data,
                    id,
                    connection
                );
                if (overlap) {
                    throw new HttpError(
                        409,
                        `${data.assignment_role} already has an overlapping active assignment for this vehicle or person`
                    );
                }
            }

            const updated = await vehicleAssignmentModel.updateVehicleAssignment(
                id,
                companyId,
                { ...data, is_active: activeFlag },
                connection
            );
            if (!updated) throw new HttpError(404, "Assignment not found");

            await writeAudit(
                req,
                "ASSIGNMENT_UPDATED",
                "vehicle_assignment",
                id,
                JSON.stringify({ before: existing, after: data }),
                { companyId, connection, required: true }
            );
        });

        const assignment = await vehicleAssignmentModel.getAssignmentById(id, companyId);
        return res.status(200).json({
            success: true,
            message: "Assignment updated successfully",
            assignment
        });
    } catch (error) {
        return sendError(res, error);
    }
};

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
    getAssignmentHistory,
    getAssignmentById,
    createVehicleAssignment,
    updateVehicleAssignment,
    deactivateVehicleAssignment,
    closeVehicleAssignment
};
