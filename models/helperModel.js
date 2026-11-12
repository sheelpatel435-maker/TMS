const db = require("../config/db");
const { paginatedSelect } = require("../utils/pagination");
const { toTinyIntStatus, firstPresent } = require("../utils/validation");
const { buildListWhere } = require("../utils/queryFilters");

const HELPER_COLUMNS = `id, company_id, user_id, name, mobile, email, address, status, created_at, updated_at`;

const getHelpers = async (companyId, pagination, filters = {}) => {
    const { where, params } = buildListWhere({
        companyId,
        filters,
        searchColumns: ["name", "mobile"],
        numericStatus: true
    });

    return paginatedSelect(db, {
        table: "helpers",
        columns: HELPER_COLUMNS,
        where,
        params,
        pagination
    });
};

const getHelperById = async (id, companyId) => {
    const [rows] = await db.execute(
        `SELECT ${HELPER_COLUMNS}
         FROM helpers
         WHERE id = ? AND company_id = ?
         LIMIT 1`,
        [id, companyId]
    );

    return rows[0] || null;
};

const createHelper = async (companyId, data, connection = null) => {
    const executor = connection || db;
    const [result] = await executor.execute(
        `INSERT INTO helpers
        (
            company_id,
            user_id,
            name,
            mobile,
            email,
            address,
            status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
            companyId,
            data.user_id || null,
            firstPresent(data.name, data.full_name),
            data.mobile,
            data.email || null,
            data.address || null,
            toTinyIntStatus(data.status, 1)
        ]
    );

    return result.insertId;
};

const findHelperByUserId = async (userId, companyId) => {
    const [rows] = await db.execute(
        `SELECT ${HELPER_COLUMNS}
         FROM helpers
         WHERE user_id = ? AND company_id = ?
         LIMIT 1`,
        [userId, companyId]
    );

    return rows[0] || null;
};

const findHelperByMobile = async (companyId, mobile) => {
    const [rows] = await db.execute(
        `SELECT ${HELPER_COLUMNS}
         FROM helpers
         WHERE company_id = ? AND mobile = ? AND status = 1
         LIMIT 1`,
        [companyId, mobile]
    );

    return rows[0] || null;
};

const updateHelper = async (id, companyId, data) => {
    const [result] = await db.execute(
        `UPDATE helpers
         SET name = ?,
             mobile = ?,
             email = ?,
             address = ?,
             status = ?
         WHERE id = ? AND company_id = ?`,
        [
            firstPresent(data.name, data.full_name),
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

const deactivateHelper = async (id, companyId) => {
    const [result] = await db.execute(
        `UPDATE helpers
         SET status = 0
         WHERE id = ? AND company_id = ?`,
        [id, companyId]
    );

    return result.affectedRows;
};

module.exports = {
    getHelpers,
    getHelperById,
    createHelper,
    findHelperByUserId,
    findHelperByMobile,
    updateHelper,
    deactivateHelper
};
