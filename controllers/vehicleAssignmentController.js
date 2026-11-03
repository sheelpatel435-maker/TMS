const vehicleAssignmentModel = require("../models/vehicleAssignmentModel");
const { parsePagination } = require("../utils/pagination");
const { sendError, HttpError } = require("../utils/httpError");
const { isMissing } = require("../utils/validation");
const { assertOwned, resolveCompanyId } = require("../utils/companyScope");
const { parseListFilters } = require("../utils/queryFilters");
const { writeAudit } = require("../utils/audit");

const isPastDate = (value) => {
    if (!value) {
        return false;
    }

    const end = new Date(value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return end < today;
};

const getVehicleAssignments = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const { rows: assignments, pagination } =
            await vehicleAssignmentModel.getVehicleAssignments(
                companyId,
                parsePagination(req.query),
                parseListFilters(req.query)
            );

        return res.status(200).json({
            success: true,
            assignments,
            pagination
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const getAssignmentById = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const assignment = await vehicleAssignmentModel.getAssignmentById(
            req.params.id,
            companyId
        );

        if (!assignment) {
            throw new HttpError(404, "Assignment not found");
        }

        return res.status(200).json({
            success: true,
            assignment
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const createVehicleAssignment = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const {
            vehicle_id,
            driver_id,
            helper_id,
            start_date,
            end_date,
            is_active
        } = req.body;

        if (isMissing(vehicle_id) || isMissing(start_date)) {
            throw new HttpError(400, "vehicle_id and start_date are required");
        }

        await assertOwned("vehicles", vehicle_id, companyId, "Vehicle");
        await assertOwned("drivers", driver_id, companyId, "Driver");
        await assertOwned("helpers", helper_id, companyId, "Helper");

        const overlap = await vehicleAssignmentModel.findOverlap(companyId, {
            vehicle_id,
            driver_id,
            start_date,
            end_date
        });

        if (overlap) {
            throw new HttpError(
                409,
                "Vehicle or driver already has an overlapping active assignment"
            );
        }

        const activeFlag = isPastDate(end_date) ? 0 : (is_active ?? 1);

        const id = await vehicleAssignmentModel.createVehicleAssignment(companyId, {
            vehicle_id,
            driver_id,
            helper_id,
            start_date,
            end_date,
            is_active: activeFlag
        });
        await writeAudit(req, "ASSIGNMENT_CREATED", "vehicle_assignment", id);

        return res.status(201).json({
            success: true,
            message: "Vehicle assignment created successfully",
            id
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const updateVehicleAssignment = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const existing = await vehicleAssignmentModel.getAssignmentById(
            req.params.id,
            companyId
        );

        if (!existing) {
            throw new HttpError(404, "Assignment not found");
        }

        const {
            vehicle_id,
            driver_id,
            helper_id,
            start_date,
            end_date,
            is_active
        } = req.body;

        if (isMissing(vehicle_id) || isMissing(start_date)) {
            throw new HttpError(400, "vehicle_id and start_date are required");
        }

        await assertOwned("vehicles", vehicle_id, companyId, "Vehicle");
        await assertOwned("drivers", driver_id, companyId, "Driver");
        await assertOwned("helpers", helper_id, companyId, "Helper");

        const activeFlag = isPastDate(end_date) ? 0 : (is_active ?? 1);

        if (activeFlag === 1) {
            const overlap = await vehicleAssignmentModel.findOverlap(
                companyId,
                { vehicle_id, driver_id, start_date, end_date },
                req.params.id
            );

            if (overlap) {
                throw new HttpError(
                    409,
                    "Vehicle or driver already has an overlapping active assignment"
                );
            }
        }

        await vehicleAssignmentModel.updateAssignment(req.params.id, companyId, {
            vehicle_id,
            driver_id,
            helper_id,
            start_date,
            end_date,
            is_active: activeFlag
        });
        await writeAudit(req, "ASSIGNMENT_UPDATED", "vehicle_assignment", req.params.id);

        return res.status(200).json({
            success: true,
            message: "Vehicle assignment updated successfully"
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const deactivateVehicleAssignment = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const endDate = new Date().toISOString().slice(0, 10);
        const updated = await vehicleAssignmentModel.closeAssignment(
            req.params.id,
            companyId,
            endDate
        );

        if (!updated) {
            throw new HttpError(404, "Assignment not found");
        }

        await writeAudit(req, "ASSIGNMENT_DEACTIVATED", "vehicle_assignment", req.params.id);

        return res.status(200).json({
            success: true,
            message: "Vehicle assignment deactivated successfully"
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const closeVehicleAssignment = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const endDate = req.body.end_date || new Date().toISOString().slice(0, 10);
        const updated = await vehicleAssignmentModel.closeAssignment(
            req.params.id,
            companyId,
            endDate
        );

        if (!updated) {
            throw new HttpError(404, "Assignment not found");
        }

        await writeAudit(req, "ASSIGNMENT_CLOSED", "vehicle_assignment", req.params.id);

        return res.status(200).json({
            success: true,
            message: "Vehicle assignment closed successfully"
        });
    } catch (error) {
        return sendError(res, error);
    }
};

module.exports = {
    getVehicleAssignments,
    getAssignmentById,
    createVehicleAssignment,
    updateVehicleAssignment,
    deactivateVehicleAssignment,
    closeVehicleAssignment
};
