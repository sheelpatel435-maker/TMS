const db = require("../config/db");
const { paginatedSelect } = require("../utils/pagination");
const { toTinyIntStatus } = require("../utils/validation");

const DRIVER_COLUMNS = `id, company_id, user_id, name, mobile, email, address, status, created_at, updated_at`;

const getDrivers = async (companyId, pagination, filters = {}) => {
    const where = ["company_id = ?"];
    const params = [companyId];

    if (filters.status !== undefined && filters.status !== "") {
        where.push("status = ?");
        params.push(toTinyIntStatus(filters.status, 1));
    }

    if (filters.search) {
        where.push("(name LIKE ? OR mobile LIKE ?)");
        const term = `%${filters.search}%`;
        params.push(term, term);
    }

    return paginatedSelect(db, {
        table: "drivers",
        columns: DRIVER_COLUMNS,
        where: where.join(" AND "),
        params,
        pagination
    });
};

const getDriverById = async (id, companyId) => {
    const [rows] = await db.execute(
        `SELECT ${DRIVER_COLUMNS}
         FROM drivers
         WHERE id = ? AND company_id = ?
         LIMIT 1`,
        [id, companyId]
    );

    return rows[0] || null;
};

const createDriver = async (companyId, data, connection = null) => {
    const executor = connection || db;
    const [result] = await executor.execute(
        `INSERT INTO drivers
        (company_id, user_id, name, mobile, email, address, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
            companyId,
            data.user_id || null,
            data.name,
            data.mobile,
            data.email || null,
            data.address || null,
            toTinyIntStatus(data.status, 1)
        ]
    );

    return result.insertId;
};

const findDriverByUserId = async (userId, companyId) => {
    const [rows] = await db.execute(
        `SELECT ${DRIVER_COLUMNS}
         FROM drivers
         WHERE user_id = ? AND company_id = ?
         LIMIT 1`,
        [userId, companyId]
    );

    return rows[0] || null;
};

const findDriverByMobile = async (companyId, mobile) => {
    const [rows] = await db.execute(
        `SELECT ${DRIVER_COLUMNS}
         FROM drivers
         WHERE company_id = ? AND mobile = ? AND status = 1
         LIMIT 1`,
        [companyId, mobile]
    );

    return rows[0] || null;
};

const updateDriver = async (id, companyId, data) => {
    const [result] = await db.execute(
        `UPDATE drivers
         SET name = ?,
             mobile = ?,
             email = ?,
             address = ?,
             status = ?
         WHERE id = ? AND company_id = ?`,
        [
            data.name,
            data.mobile,
            data.email || null,
            data.address || null,
            toTinyIntStatus(data.status, 1),
            id,
            companyId
        ]
    );

    return result.affectedRows;
};

const deactivateDriver = async (id, companyId) => {
    const [result] = await db.execute(
        `UPDATE drivers
         SET status = 0
         WHERE id = ? AND company_id = ?`,
        [id, companyId]
    );

    return result.affectedRows;
};

module.exports = {
    getDrivers,
    getDriverById,
    createDriver,
    findDriverByUserId,
    findDriverByMobile,
    updateDriver,
    deactivateDriver
};
