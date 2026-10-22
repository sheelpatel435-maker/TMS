const db = require("../config/db");
const { paginatedSelect } = require("../utils/pagination");
const { toTinyIntStatus, firstPresent } = require("../utils/validation");

const getHelpers = async (companyId, pagination) => {
    return paginatedSelect(db, {
        table: "helpers",
        columns: `id, company_id, name, mobile, email, address, status, created_at, updated_at`,
        where: "company_id = ?",
        params: [companyId],
        pagination
    });
};

const createHelper = async (companyId, data) => {
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
            firstPresent(data.name, data.full_name),
            data.mobile,
            data.email || null,
            data.address || null,
            toTinyIntStatus(data.status, 1)
        ]
    );

    return result.insertId;
};

module.exports = {
    getHelpers,
    createHelper
};
