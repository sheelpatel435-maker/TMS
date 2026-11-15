const db = require("../config/db");
const { paginatedSelect } = require("../utils/pagination");
const { toTinyIntStatus } = require("../utils/validation");
const { buildListWhere } = require("../utils/queryFilters");

const TYPE_COLUMNS = `id, company_id, name, status, created_at, updated_at`;

const getVehicleTypes = async (companyId, pagination, filters = {}) => {
    const { where, params } = buildListWhere({
        companyId,
        filters,
        searchColumns: ["name"],
        numericStatus: true
    });

    return paginatedSelect(db, {
        table: "vehicle_types",
        columns: TYPE_COLUMNS,
        where,
        params,
        orderBy: "id ASC",
        pagination
    });
};

const getVehicleTypeById = async (id, companyId) => {
    const [rows] = await db.execute(
        `SELECT ${TYPE_COLUMNS}
         FROM vehicle_types
         WHERE id = ? AND company_id = ?
         LIMIT 1`,
        [id, companyId]
    );

    return rows[0] || null;
};

const createVehicleType = async (companyId, name, status = 1) => {
    const [result] = await db.execute(
        `INSERT INTO vehicle_types
        (company_id, name, status)
        VALUES (?, ?, ?)`,
        [companyId, name, toTinyIntStatus(status, 1)]
    );

    return result.insertId;
};

const updateVehicleType = async (id, companyId, data) => {
    const [result] = await db.execute(
        `UPDATE vehicle_types
         SET name = ?,
             status = ?
         WHERE id = ? AND company_id = ?`,
        [data.name, toTinyIntStatus(data.status, 1), id, companyId]
    );

    return result.affectedRows;
};

const deactivateVehicleType = async (id, companyId) => {
    const [result] = await db.execute(
        `UPDATE vehicle_types
         SET status = 0
         WHERE id = ? AND company_id = ?`,
        [id, companyId]
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
