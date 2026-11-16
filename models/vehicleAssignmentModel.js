const db = require("../config/db");
const { paginatedSelect } = require("../utils/pagination");
const { buildListWhere } = require("../utils/queryFilters");
const { HttpError } = require("../utils/httpError");

const ASSIGNMENT_COLUMNS = `id, company_id, vehicle_id, assignment_role, driver_id, helper_id,
                  start_date, end_date, is_active, created_at, updated_at`;

const getVehicleAssignments = async (companyId, pagination, filters = {}) => {
    const listFilters = { ...filters };
    const vehicleId = listFilters.vehicle_id;
    const driverId = listFilters.driver_id;
    const helperId = listFilters.helper_id;
    const role = listFilters.assignment_role || listFilters.role;
    const includeInactive = listFilters.include_inactive;
    delete listFilters.vehicle_id;
    delete listFilters.driver_id;
    delete listFilters.helper_id;
    delete listFilters.assignment_role;
    delete listFilters.role;
    delete listFilters.include_inactive;

    // History views: return active + closed unless status explicitly filtered
    if (
        (includeInactive === true ||
            includeInactive === "1" ||
            includeInactive === "true") &&
        (listFilters.status === undefined || listFilters.status === "")
    ) {
        delete listFilters.status;
    }

    const { where: baseWhere, params } = buildListWhere({
        companyId,
        filters: listFilters,
        statusColumn: "is_active",
        numericStatus: true,
        dateColumn: "start_date"
    });

    const where = [baseWhere].filter(Boolean);
    if (vehicleId) {
        where.push("vehicle_id = ?");
        params.push(Number(vehicleId));
    }
    if (driverId) {
        where.push("driver_id = ?");
        params.push(Number(driverId));
    }
    if (helperId) {
        where.push("helper_id = ?");
        params.push(Number(helperId));
    }
    if (role) {
        where.push("assignment_role = ?");
        params.push(String(role).toUpperCase());
    }

    return paginatedSelect(db, {
        table: "vehicle_assignments",
        columns: ASSIGNMENT_COLUMNS,
        where: where.join(" AND "),
        params,
        orderBy: "start_date DESC, id DESC",
        pagination
    });
};

const getAssignmentById = async (id, companyId, executor = db) => {
    const [rows] = await executor.execute(
        `SELECT ${ASSIGNMENT_COLUMNS}
         FROM vehicle_assignments
         WHERE id = ? AND company_id = ?
         LIMIT 1`,
        [id, companyId]
    );

    return rows[0] || null;
};

/**
 * Overlap rules (separate driver/helper assignments):
 * - One active DRIVER assignment per vehicle in date range
 * - One active HELPER assignment per vehicle in date range
 * - Same driver cannot have overlapping active DRIVER assignments
 * - Same helper cannot have overlapping active HELPER assignments
 */
const findOverlap = async (companyId, data, excludeId = null, executor = db) => {
    const role = data.assignment_role;
    const personId = role === "DRIVER" ? data.driver_id : data.helper_id;
    const personColumn = role === "DRIVER" ? "driver_id" : "helper_id";

    const [rows] = await executor.execute(
        `SELECT id
         FROM vehicle_assignments
         WHERE company_id = ?
           AND is_active = 1
           AND assignment_role = ?
           AND (? IS NULL OR id <> ?)
           AND (
                vehicle_id = ?
                OR ${personColumn} = ?
           )
           AND start_date <= COALESCE(?, '9999-12-31')
           AND (end_date IS NULL OR end_date >= ?)
         LIMIT 1`,
        [
            companyId,
            role,
            excludeId,
            excludeId,
            data.vehicle_id,
            personId,
            data.end_date || "9999-12-31",
            data.start_date
        ]
    );

    return rows[0] || null;
};

const lockAssignmentResources = async (companyId, data, executor) => {
    const [vehicles] = await executor.execute(
        `SELECT id, status
         FROM vehicles
         WHERE company_id = ? AND id = ?
         LIMIT 1
         FOR UPDATE`,
        [companyId, data.vehicle_id]
    );
    if (!vehicles[0]) {
        throw new HttpError(404, "Vehicle not found");
    }
    if (data.is_active === 1 && Number(vehicles[0].status) !== 1) {
        throw new HttpError(
            409,
            "An assignment can only be made to an active vehicle"
        );
    }

    if (data.assignment_role === "DRIVER") {
        const [drivers] = await executor.execute(
            `SELECT id, status
             FROM drivers
             WHERE company_id = ? AND id = ?
             LIMIT 1
             FOR UPDATE`,
            [companyId, data.driver_id]
        );
        if (!drivers[0]) throw new HttpError(404, "Driver not found for this company");
        if (data.is_active === 1 && Number(drivers[0].status) !== 1) {
            throw new HttpError(409, "An assignment can only use an active driver");
        }
    }

    if (data.assignment_role === "HELPER") {
        const [helpers] = await executor.execute(
            `SELECT id, status
             FROM helpers
             WHERE company_id = ? AND id = ?
             LIMIT 1
             FOR UPDATE`,
            [companyId, data.helper_id]
        );
        if (!helpers[0]) throw new HttpError(404, "Helper not found for this company");
        if (data.is_active === 1 && Number(helpers[0].status) !== 1) {
            throw new HttpError(409, "An assignment can only use an active helper");
        }
    }
};

const createVehicleAssignment = async (companyId, data, executor = db) => {
    const [result] = await executor.execute(
        `INSERT INTO vehicle_assignments
        (
            company_id,
            vehicle_id,
            assignment_role,
            driver_id,
            helper_id,
            start_date,
            end_date,
            is_active
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            companyId,
            data.vehicle_id,
            data.assignment_role,
            data.driver_id || null,
            data.helper_id || null,
            data.start_date,
            data.end_date || null,
            data.is_active ?? 1
        ]
    );

    return result.insertId;
};

const updateVehicleAssignment = async (id, companyId, data, executor = db) => {
    const [result] = await executor.execute(
        `UPDATE vehicle_assignments
         SET vehicle_id = ?,
             assignment_role = ?,
             driver_id = ?,
             helper_id = ?,
             start_date = ?,
             end_date = ?,
             is_active = ?
         WHERE id = ? AND company_id = ?`,
        [
            data.vehicle_id,
            data.assignment_role,
            data.driver_id || null,
            data.helper_id || null,
            data.start_date,
            data.end_date || null,
            data.is_active ?? 1,
            id,
            companyId
        ]
    );

    return result.affectedRows;
};

const closeAssignment = async (id, companyId, endDate, executor = db) => {
    const [result] = await executor.execute(
        `UPDATE vehicle_assignments
         SET end_date = ?,
             is_active = 0
         WHERE id = ? AND company_id = ?`,
        [endDate, id, companyId]
    );

    return result.affectedRows;
};

module.exports = {
    getVehicleAssignments,
    getAssignmentById,
    findOverlap,
    lockAssignmentResources,
    createVehicleAssignment,
    updateVehicleAssignment,
    closeAssignment
};
