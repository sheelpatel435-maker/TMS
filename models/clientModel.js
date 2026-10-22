const db = require("../config/db");
const { paginatedSelect } = require("../utils/pagination");
const { toTinyIntStatus, firstPresent } = require("../utils/validation");

const getClients = async (companyId, pagination) => {
    return paginatedSelect(db, {
        table: "clients",
        columns: `id, company_id, name, mobile, email, address, gst_number, status, created_at, updated_at`,
        where: "company_id = ?",
        params: [companyId],
        pagination
    });
};

const createClient = async (companyId, data) => {
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
            firstPresent(data.name, data.client_name),
            data.mobile || null,
            data.email || null,
            data.address || null,
            data.gst_number || null,
            toTinyIntStatus(data.status, 1)
        ]
    );

    return result.insertId;
};

module.exports = {
    getClients,
    createClient
};
