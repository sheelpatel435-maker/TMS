const db = require("../config/db");

const getHelpers = async (companyId) => {
    const [rows] = await db.execute(
        `SELECT
            id,
            company_id,
            name,
            mobile,
            email,
            address,
            status,
            created_at,
            updated_at
         FROM helpers
         WHERE company_id = ?
         ORDER BY id DESC`,
        [companyId]
    );

    return rows;
};

const createHelper = async (
    companyId,
    name,
    mobile,
    email,
    address,
    status
) => {
    const [result] = await db.execute(
        `INSERT INTO helpers
        (
            company_id,
            name,
            mobile,
            email,
            address,
            status
        )
        VALUES (?, ?, ?, ?, ?, ?)`,
        [
            companyId,
            name,
            mobile,
            email || null,
            address || null,
            status || 1
        ]
    );

    return result.insertId;
};

module.exports = {
    getHelpers,
    createHelper
};
