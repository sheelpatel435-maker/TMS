const db = require("../config/db");
const { paginatedSelect } = require("../utils/pagination");
const { toTinyIntStatus } = require("../utils/validation");
const { buildListWhere } = require("../utils/queryFilters");

const getVehicleTypes = async (pagination, filters = {}) => {
    const { where, params } = buildListWhere({
        filters,
        searchColumns: ["name"],
        numericStatus: true
    });

    return paginatedSelect(db, {
        table: "vehicle_types",
        columns: `id, name, status, created_at, updated_at`,
        where,
        params,
        orderBy: "id ASC",
        pagination
    });
};

const getVehicleTypeById = async (id) => {
    const [rows] = await db.execute(
        `SELECT id, name, status, created_at, updated_at
         FROM vehicle_types
         WHERE id = ?
         LIMIT 1`,
        [id]
    );

    return rows[0] || null;
};

const createVehicleType = async (name, status = 1) => {
    const [result] = await db.execute(
        `INSERT INTO vehicle_types
        (name, status)
        VALUES (?, ?)`,
        [name, toTinyIntStatus(status, 1)]
    );

    return result.insertId;
};

const updateVehicleType = async (id, data) => {
    const [result] = await db.execute(
        `UPDATE vehicle_types
         SET name = ?,
             status = ?
         WHERE id = ?`,
        [data.name, toTinyIntStatus(data.status, 1), id]
    );

    return result.affectedRows;
};

const deactivateVehicleType = async (id) => {
    const [result] = await db.execute(
        `UPDATE vehicle_types
         SET status = 0
         WHERE id = ?`,
        [id]
    );

    return result.affectedRows;
};

module.exports = {
    getVehicleTypes,
    getVehicleTypeById,
    createVehicleType,
    updateVehicleType,
    deactivateVehicleType
};
