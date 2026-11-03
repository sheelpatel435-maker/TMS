const db = require("../config/db");
const { paginatedSelect } = require("../utils/pagination");

const insertAudit = async (data) => {
    await db.execute(
        `INSERT INTO audit_logs
        (company_id, user_id, action, entity_type, entity_id, description, ip_address)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
            data.company_id || null,
            data.user_id || null,
            data.action,
            data.entity_type || null,
            data.entity_id || null,
            data.description || null,
            data.ip_address || null
        ]
    );
};

const getAuditLogs = async (companyId, pagination) => {
    const where = companyId ? "company_id = ?" : "";
    const params = companyId ? [companyId] : [];

    return paginatedSelect(db, {
        table: "audit_logs",
        columns: "*",
        where,
        params,
        pagination
    });
};

module.exports = {
    insertAudit,
    getAuditLogs
};
