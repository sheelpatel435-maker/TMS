const db = require("../config/db");
const { paginatedSelect } = require("../utils/pagination");
const { toTinyIntStatus } = require("../utils/validation");
const { buildListWhere } = require("../utils/queryFilters");

const VEHICLE_COLUMNS = `id, company_id, vehicle_type_id, registration_no, capacity, status, created_at, updated_at`;

const getVehicles = async (companyId, pagination, filters = {}) => {
    const { where, params } = buildListWhere({
        companyId,
        filters,
        searchColumns: ["registration_no"],
        numericStatus: true
    });

    return paginatedSelect(db, {
        table: "vehicles",
        columns: VEHICLE_COLUMNS,
        where,
        params,
        pagination
    });
};

const getVehicleById = async (id, companyId) => {
    const [rows] = await db.execute(
        `SELECT ${VEHICLE_COLUMNS}
         FROM vehicles
         WHERE id = ? AND company_id = ?
         LIMIT 1`,
        [id, companyId]
    );

    return rows[0] || null;
};

const createVehicle = async (companyId, data) => {
    const [result] = await db.execute(
        `INSERT INTO vehicles
        (
            company_id,
            vehicle_type_id,
            registration_no,
            capacity,
            status
        )
        VALUES (?, ?, ?, ?, ?)`,
        [
            companyId,
            data.vehicle_type_id,
            data.registration_no,
            data.capacity || null,
            toTinyIntStatus(data.status, 1)
        ]
    );

    return result.insertId;
};

const updateVehicle = async (id, companyId, data) => {
    const [result] = await db.execute(
        `UPDATE vehicles
         SET vehicle_type_id = ?,
             registration_no = ?,
             capacity = ?,
             status = ?
         WHERE id = ? AND company_id = ?`,
        [
            data.vehicle_type_id,
            data.registration_no,
            data.capacity || null,
            toTinyIntStatus(data.status, 1),
            id,
            companyId
        ]
    );

    return result.affectedRows;
};

const deactivateVehicle = async (id, companyId) => {
    const [result] = await db.execute(
        `UPDATE vehicles
         SET status = 0
         WHERE id = ? AND company_id = ?`,
        [id, companyId]
    );

    return result.affectedRows;
};

module.exports = {
    getVehicles,
    getVehicleById,
    createVehicle,
    updateVehicle,
    deactivateVehicle
};
