const db = require("../config/db");
const { paginatedSelect } = require("../utils/pagination");
const { buildListWhere } = require("../utils/queryFilters");

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

const findOverlap = async (companyId, data, excludeId = null) => {
    const [rows] = await db.execute(
        `SELECT id
         FROM vehicle_assignments
         WHERE company_id = ?
         AND is_active = 1
         AND (? IS NULL OR id <> ?)
         AND (
            vehicle_id = ?
            OR (? IS NOT NULL AND driver_id = ?)
         )
         AND start_date <= COALESCE(?, '9999-12-31')
         AND (end_date IS NULL OR end_date >= ?)
         LIMIT 1`,
        [
            companyId,
            excludeId,
            excludeId,
            data.vehicle_id,
            data.driver_id || null,
            data.driver_id || null,
            data.end_date || "9999-12-31",
            data.start_date
        ]
    );

    return rows[0] || null;
};

const createVehicleAssignment = async (companyId, data) => {
    const [result] = await db.execute(
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

const updateAssignment = async (id, companyId, data) => {
    const [result] = await db.execute(
        `UPDATE vehicle_assignments
         SET vehicle_id = ?,
             driver_id = ?,
             helper_id = ?,
             start_date = ?,
             end_date = ?,
             is_active = ?
         WHERE id = ? AND company_id = ?`,
        [
            data.vehicle_id,
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

const closeAssignment = async (id, companyId, endDate) => {
    const [result] = await db.execute(
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
    createVehicleAssignment,
    updateAssignment,
    closeAssignment
};
