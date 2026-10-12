const db = require("../config/db");

const getDrivers = async (companyId) => {
    const [rows] = await db.execute(
        `SELECT *
         FROM drivers
         WHERE company_id = ?
         ORDER BY id DESC`,
        [companyId]
    );

    return rows;
};

const createDriver = async (companyId, data) => {
    const [result] = await db.execute(
        `INSERT INTO drivers
        (company_id, name, mobile, email, license_number, status)
        VALUES (?, ?, ?, ?, ?, ?)`,
        [
            companyId,
            data.name,
            data.mobile,
            data.email || null,
            data.license_number,
            data.status || "ACTIVE"
        ]
    );

    return result.insertId;
};

module.exports = {
    getDrivers,
    createDriver
};