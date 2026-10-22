const db = require("../config/db");
const { paginatedSelect } = require("../utils/pagination");
const { toTinyIntStatus } = require("../utils/validation");

const getHelperDocuments = async (companyId, helperId, pagination) => {
    const where = helperId
        ? "company_id = ? AND helper_id = ?"
        : "company_id = ?";
    const params = helperId ? [companyId, helperId] : [companyId];

    return paginatedSelect(db, {
        table: "helper_documents",
        columns: `id, company_id, helper_id, document_type, document_number,
                  document_url, issue_date, expiry_date, status, created_at, updated_at`,
        where,
        params,
        pagination
    });
};

const createHelperDocument = async (companyId, helperId, data) => {
    const [result] = await db.execute(
        `INSERT INTO helper_documents
        (
            company_id,
            helper_id,
            document_type,
            document_number,
            document_url,
            issue_date,
            expiry_date,
            status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            companyId,
            helperId,
            data.document_type,
            data.document_number || null,
            data.document_url || null,
            data.issue_date || null,
            data.expiry_date || null,
            toTinyIntStatus(data.status, 1)
        ]
    );

    return result.insertId;
};

module.exports = {
    getHelperDocuments,
    createHelperDocument
};
