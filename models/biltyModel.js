const db = require("../config/db");

const getBilties = async (companyId) => {
    const [rows] = await db.execute(
        `SELECT id, company_id, bilty_number, client_id,
                status, trip_id, created_at, updated_at
         FROM bilties
         WHERE company_id = ?
         ORDER BY id DESC`,
        [companyId]
    );

    return rows;
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
    createBilty
};
