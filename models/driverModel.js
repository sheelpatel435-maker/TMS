const db = require("../config/db");
const { paginatedSelect } = require("../utils/pagination");
const { toTinyIntStatus } = require("../utils/validation");

const getDrivers = async (companyId, pagination) => {
    return paginatedSelect(db, {
        table: "drivers",
        columns: `id, company_id, name, mobile, email, address, status, created_at, updated_at`,
        where: "company_id = ?",
        params: [companyId],
        pagination
    });
};

const createDriver = async (companyId, data) => {
    const [result] = await db.execute(
        `INSERT INTO drivers
        (company_id, name, mobile, email, address, status)
        VALUES (?, ?, ?, ?, ?, ?)`,
        [
            companyId,
            data.name,
            data.mobile,
            data.email || null,
            data.address || null,
            toTinyIntStatus(data.status, 1)
        ]
    );

    return result.insertId;
};

module.exports = {
    getDrivers,
    createDriver
};
