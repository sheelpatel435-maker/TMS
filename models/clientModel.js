const db = require("../config/db");
const { paginatedSelect } = require("../utils/pagination");
const { toTinyIntStatus, firstPresent } = require("../utils/validation");
const { buildListWhere } = require("../utils/queryFilters");

const CLIENT_COLUMNS = `id, company_id, name, mobile, email, billing_email, address,
                        gst_number, state_code, payment_terms, contact_person,
                        invoice_email_recipients, tax_preference, status,
                        created_at, updated_at`;

const normalizeRecipients = (value) => {
    if (value === undefined || value === null || value === "") {
        return null;
    }
    if (Array.isArray(value)) {
        const cleaned = value
            .map((item) => String(item || "").trim())
            .filter(Boolean);
        return cleaned.length ? JSON.stringify(cleaned) : null;
    }
    const raw = String(value).trim();
    if (!raw) return null;
    if (raw.startsWith("[")) {
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                return normalizeRecipients(parsed);
            }
        } catch {
            // fall through to CSV parse
        }
    }
    return normalizeRecipients(raw.split(/[,;\n]+/));
};

const parseRecipients = (value) => {
    if (!value) return [];
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return String(value)
            .split(/[,;\n]+/)
            .map((item) => item.trim())
            .filter(Boolean);
    }
};

const mapClient = (row) => {
    if (!row) return null;
    return {
        ...row,
        invoice_email_recipients: parseRecipients(row.invoice_email_recipients)
    };
};

const getClients = async (companyId, pagination, filters = {}) => {
    const { where, params } = buildListWhere({
        companyId,
        filters,
        searchColumns: ["name", "mobile", "gst_number", "billing_email", "contact_person"],
        numericStatus: true
    });

    const result = await paginatedSelect(db, {
        table: "clients",
        columns: CLIENT_COLUMNS,
        where,
        params,
        pagination
    });

    return {
        ...result,
        rows: (result.rows || []).map(mapClient)
    };
};

const getClientById = async (id, companyId) => {
    const [rows] = await db.execute(
        `SELECT ${CLIENT_COLUMNS}
         FROM clients
         WHERE id = ? AND company_id = ?
         LIMIT 1`,
        [id, companyId]
    );

    return mapClient(rows[0] || null);
};

const findClientByGst = async (companyId, gstNumber, excludeId = null) => {
    if (!gstNumber) {
        return null;
    }

    const params = [companyId, gstNumber];
    let sql = `SELECT ${CLIENT_COLUMNS}
               FROM clients
               WHERE company_id = ? AND gst_number = ?`;

    if (excludeId) {
        sql += " AND id <> ?";
        params.push(excludeId);
    }

    sql += " LIMIT 1";
    const [rows] = await db.execute(sql, params);
    return mapClient(rows[0] || null);
};

const findClientByMobile = async (companyId, mobile, excludeId = null) => {
    if (!mobile) {
        return null;
    }

    const params = [companyId, mobile];
    let sql = `SELECT ${CLIENT_COLUMNS}
               FROM clients
               WHERE company_id = ? AND mobile = ?`;

    if (excludeId) {
        sql += " AND id <> ?";
        params.push(excludeId);
    }

    sql += " LIMIT 1";
    const [rows] = await db.execute(sql, params);
    return mapClient(rows[0] || null);
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
            contact_person,
            invoice_email_recipients,
            tax_preference,
            status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            companyId,
            firstPresent(data.name, data.client_name),
            data.mobile || null,
            data.email || null,
            data.billing_email || data.email || null,
            data.address || data.billing_address || null,
            data.gst_number || data.gstin || null,
            data.state_code || data.state || null,
            data.payment_terms || null,
            data.contact_person || null,
            normalizeRecipients(
                data.invoice_email_recipients || data.email_recipients
            ),
            data.tax_preference || "AUTO",
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
             contact_person = ?,
             invoice_email_recipients = ?,
             tax_preference = ?,
             status = ?
         WHERE id = ? AND company_id = ?`,
        [
            firstPresent(data.name, data.client_name),
            data.mobile || null,
            data.email || null,
            data.billing_email || data.email || null,
            data.address || data.billing_address || null,
            data.gst_number || data.gstin || null,
            data.state_code || data.state || null,
            data.payment_terms || null,
            data.contact_person || null,
            normalizeRecipients(
                data.invoice_email_recipients || data.email_recipients
            ),
            data.tax_preference || "AUTO",
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
    findClientByGst,
    findClientByMobile,
    createClient,
    updateClient,
    deactivateClient
};
