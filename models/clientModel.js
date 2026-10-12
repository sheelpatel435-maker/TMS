const db = require("../config/db");

const getClients = async (companyId) => {
    const [rows] = await db.execute(
        `SELECT
            id,
            company_id,
            name,
            mobile,
            email,
            address,
            gst_number,
            status,
            created_at,
            updated_at
         FROM clients
         WHERE company_id = ?
         ORDER BY id DESC`,
        [companyId]
    );

    return rows;
};

const createClient = async (
    companyId,
    name,
    mobile,
    email,
    address,
    gstNumber,
    status
) => {
    const [result] = await db.execute(
        `INSERT INTO clients
        (
            company_id,
            name,
            mobile,
            email,
            address,
            gst_number,
            status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
            companyId,
            name,
            mobile || null,
            email || null,
            address || null,
            gstNumber || null,
            status ?? 1
        ]
    );

    return result.insertId;
};

module.exports = {
    getClients,
    createClient
};
