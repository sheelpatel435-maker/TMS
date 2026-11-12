const db = require("../config/db");
const { paginatedSelect } = require("../utils/pagination");
const { buildListWhere } = require("../utils/queryFilters");
const { HttpError } = require("../utils/httpError");

const getVehicleAssignments = async (companyId, pagination, filters = {}) => {
    const { where, params } = buildListWhere({
        companyId,
        filters,
        statusColumn: "is_active",
        numericStatus: true
    });

    return paginatedSelect(db, {
        table: "vehicle_assignments",
        columns: `id, company_id, vehicle_id, driver_id, helper_id, start_date,
                  end_date, is_active, created_at, updated_at`,
        where,
        params,
        pagination
    });
};

const getAssignmentById = async (id, companyId) => {
    const [rows] = await db.execute(
        `SELECT id, company_id, vehicle_id, driver_id, helper_id, start_date,
                end_date, is_active, created_at, updated_at
         FROM vehicle_assignments
         WHERE id = ? AND company_id = ?
         LIMIT 1`,
        [id, companyId]
    );

    return rows[0] || null;
};

const findOverlap = async (companyId, data, excludeId = null, executor = db) => {
    const [rows] = await executor.execute(
        `SELECT id
         FROM vehicle_assignments
         WHERE company_id = ?
         AND is_active = 1
         AND (? IS NULL OR id <> ?)
         AND (
            (
                ? IS NOT NULL
                AND (
                    (vehicle_id = ? AND driver_id IS NOT NULL)
                    OR driver_id = ?
                )
            )
            OR (
                ? IS NOT NULL
                AND (
                    (vehicle_id = ? AND helper_id IS NOT NULL)
                    OR helper_id = ?
                )
            )
         )
         AND start_date <= COALESCE(?, '9999-12-31')
         AND (end_date IS NULL OR end_date >= ?)
         LIMIT 1`,
        [
            companyId,
            excludeId,
            excludeId,
            data.driver_id || null,
            data.vehicle_id,
            data.driver_id || null,
            data.helper_id || null,
            data.vehicle_id,
            data.helper_id || null,
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
    if (data.driver_id) {
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
    if (data.helper_id) {
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
            driver_id,
            helper_id,
            start_date,
            end_date,
            is_active
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
            companyId,
            data.vehicle_id,
            data.driver_id || null,
            data.helper_id || null,
            data.start_date,
            data.end_date || null,
            data.is_active ?? 1
        ]
    );

    return result.insertId;
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
    closeAssignment
};
