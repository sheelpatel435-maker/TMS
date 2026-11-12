const db = require("../config/db");
const { paginatedSelect } = require("../utils/pagination");
const { toTinyIntStatus, firstPresent } = require("../utils/validation");
const { buildListWhere } = require("../utils/queryFilters");

const CLIENT_COLUMNS = `id, company_id, name, mobile, email, billing_email, address,
                        gst_number, state_code, payment_terms, status, created_at, updated_at`;

const getClients = async (companyId, pagination, filters = {}) => {
    const { where, params } = buildListWhere({
        companyId,
        filters,
        searchColumns: ["name", "mobile", "gst_number", "billing_email"],
        numericStatus: true
    });

    return paginatedSelect(db, {
        table: "clients",
        columns: CLIENT_COLUMNS,
        where,
        params,
        pagination
    });
};

const getClientById = async (id, companyId) => {
    const [rows] = await db.execute(
        `SELECT ${CLIENT_COLUMNS}
         FROM clients
         WHERE id = ? AND company_id = ?
         LIMIT 1`,
        [id, companyId]
    );

    return rows[0] || null;
};

const createClient = async (companyId, data) => {
    const [result] = await db.execute(
        `INSERT INTO clients
        (
            company_id,
            name,
            mobile,
            email,
            billing_email,
            address,
            gst_number,
            state_code,
            payment_terms,
            status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            companyId,
            firstPresent(data.name, data.client_name),
            data.mobile || null,
            data.email || null,
            data.billing_email || data.email || null,
            data.address || null,
            data.gst_number || null,
            data.state_code || data.state || null,
            data.payment_terms || null,
            toTinyIntStatus(data.status, 1)
        ]
    );

    return result.insertId;
};

const updateClient = async (id, companyId, data) => {
    const [result] = await db.execute(
        `UPDATE clients
         SET name = ?,
             mobile = ?,
             email = ?,
             billing_email = ?,
             address = ?,
             gst_number = ?,
             state_code = ?,
             payment_terms = ?,
             status = ?
         WHERE id = ? AND company_id = ?`,
        [
            firstPresent(data.name, data.client_name),
            data.mobile || null,
            data.email || null,
            data.billing_email || data.email || null,
            data.address || null,
            data.gst_number || null,
            data.state_code || data.state || null,
            data.payment_terms || null,
            toTinyIntStatus(data.status, 1),
            id,
            companyId
        ]
    );

    return result.affectedRows;
};

const deactivateClient = async (id, companyId) => {
    const [result] = await db.execute(
        `UPDATE clients
         SET status = 0
         WHERE id = ? AND company_id = ?`,
        [id, companyId]
    );

    return result.affectedRows;
};

module.exports = {
    getClients,
    getClientById,
    createClient,
    updateClient,
    deactivateClient
};
