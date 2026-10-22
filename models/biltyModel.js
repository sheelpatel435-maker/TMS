const db = require("../config/db");
const { paginatedSelect } = require("../utils/pagination");

const getBilties = async (companyId, pagination) => {
    return paginatedSelect(db, {
        table: "bilties",
        columns: `id, company_id, bilty_number, client_id, status, trip_id, created_at, updated_at`,
        where: "company_id = ?",
        params: [companyId],
        pagination
    });
};

const findByNumber = async (companyId, biltyNumber) => {
    const [rows] = await db.execute(
        `SELECT id
         FROM bilties
         WHERE company_id = ? AND bilty_number = ?
         LIMIT 1`,
        [companyId, biltyNumber]
    );

    return rows[0] || null;
};

const createBilty = async (companyId, data) => {
    const [result] = await db.execute(
        `INSERT INTO bilties
        (company_id, bilty_number, client_id, status, trip_id)
        VALUES (?, ?, ?, ?, ?)`,
        [
            companyId,
            data.bilty_number,
            data.client_id || null,
            data.status || "CREATED",
            data.trip_id || null
        ]
    );

    return result.insertId;
};

module.exports = {
    getBilties,
    findByNumber,
    createBilty
};
