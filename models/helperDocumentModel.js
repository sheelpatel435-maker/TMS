const db = require("../config/db");
const { paginatedSelect } = require("../utils/pagination");
const { toTinyIntStatus } = require("../utils/validation");

const DOC_COLUMNS = `id, company_id, helper_id, document_type, document_number,
                  document_url, issue_date, expiry_date, status, created_at, updated_at`;

const getHelperDocuments = async (companyId, helperId, pagination) => {
    const where = helperId
        ? "company_id = ? AND helper_id = ?"
        : "company_id = ?";
    const params = helperId ? [companyId, helperId] : [companyId];

    return paginatedSelect(db, {
        table: "helper_documents",
        columns: DOC_COLUMNS,
        where,
        params,
        pagination
    });
};

const getHelperDocumentById = async (id, companyId) => {
    const [rows] = await db.execute(
        `SELECT ${DOC_COLUMNS}
         FROM helper_documents
         WHERE id = ? AND company_id = ?
         LIMIT 1`,
        [id, companyId]
    );

    return rows[0] || null;
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

const updateHelperDocument = async (id, companyId, data) => {
    const [result] = await db.execute(
        `UPDATE helper_documents
         SET document_type = ?,
             document_number = ?,
             document_url = ?,
             issue_date = ?,
             expiry_date = ?,
             status = ?
         WHERE id = ? AND company_id = ?`,
        [
            data.document_type,
            data.document_number || null,
            data.document_url || null,
            data.issue_date || null,
            data.expiry_date || null,
            toTinyIntStatus(data.status, 1),
            id,
            companyId
        ]
    );

    return result.affectedRows;
};

const deactivateHelperDocument = async (id, companyId) => {
    const [result] = await db.execute(
        `UPDATE helper_documents
         SET status = 0
         WHERE id = ? AND company_id = ?`,
        [id, companyId]
    );

    return result.affectedRows;
};

module.exports = {
    getHelperDocuments,
    getHelperDocumentById,
    createHelperDocument,
    updateHelperDocument,
    deactivateHelperDocument
};
