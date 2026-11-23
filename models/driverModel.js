const db = require("../config/db");
const { paginatedSelect } = require("../utils/pagination");
const { toTinyIntStatus } = require("../utils/validation");
const { AVAILABILITY_STATUSES } = require("../utils/crewWorkflow");

const DRIVER_COLUMNS = `id, company_id, user_id, name, mobile, email, address,
    availability_status, status, created_at, updated_at`;

const normalizeAvailability = (value, fallback = "AVAILABLE") => {
    const status = String(value || fallback).toUpperCase();
    return AVAILABILITY_STATUSES.includes(status) ? status : fallback;
};

const getDrivers = async (companyId, pagination, filters = {}) => {
    const where = ["company_id = ?"];
    const params = [companyId];

    if (filters.status !== undefined && filters.status !== "") {
        where.push("status = ?");
        params.push(toTinyIntStatus(filters.status, 1));
    }

    if (filters.availability_status) {
        where.push("availability_status = ?");
        params.push(String(filters.availability_status).toUpperCase());
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
        (company_id, user_id, name, mobile, email, address, availability_status, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            companyId,
            data.user_id || null,
            data.name,
            data.mobile,
            data.email || null,
            data.address || null,
            normalizeAvailability(data.availability_status, "AVAILABLE"),
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

const findDriverByMobile = async (companyId, mobile, excludeId = null) => {
    const params = [companyId, mobile];
    let sql = `SELECT ${DRIVER_COLUMNS}
               FROM drivers
               WHERE company_id = ? AND mobile = ?`;

    if (excludeId) {
        sql += " AND id <> ?";
        params.push(excludeId);
    }

    sql += " LIMIT 1";

    const [rows] = await db.execute(sql, params);
    return rows[0] || null;
};

const updateDriver = async (id, companyId, data) => {
    const [result] = await db.execute(
        `UPDATE drivers
         SET name = ?,
             mobile = ?,
             email = ?,
             address = ?,
             availability_status = ?,
             status = ?
         WHERE id = ? AND company_id = ?`,
        [
            data.name,
            data.mobile,
            data.email || null,
            data.address || null,
            normalizeAvailability(
                data.availability_status,
                data.availability_status || "AVAILABLE"
            ),
            toTinyIntStatus(data.status, 1),
            id,
            companyId
        ]
    );

    return result.affectedRows;
};

const setAvailability = async (id, companyId, availabilityStatus) => {
    const [result] = await db.execute(
        `UPDATE drivers
         SET availability_status = ?
         WHERE id = ? AND company_id = ?`,
        [normalizeAvailability(availabilityStatus), id, companyId]
    );

    return result.affectedRows;
};

const deactivateDriver = async (id, companyId) => {
    const [result] = await db.execute(
        `UPDATE drivers
         SET status = 0,
             availability_status = 'INACTIVE'
         WHERE id = ? AND company_id = ?`,
        [id, companyId]
    );

    return result.affectedRows;
};

const setDutyStatus = async (id, companyId, { status, availability_status }) => {
    const [result] = await db.execute(
        `UPDATE drivers
         SET status = ?,
             availability_status = ?
         WHERE id = ? AND company_id = ?`,
        [
            toTinyIntStatus(status, 1),
            normalizeAvailability(availability_status, "AVAILABLE"),
            id,
            companyId
        ]
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
    setAvailability,
    deactivateDriver,
    setDutyStatus
};
