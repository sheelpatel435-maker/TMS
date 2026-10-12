const db = require("../config/db");

const getHelperDocuments = async (companyId, helperId = null) => {
    let query = `
        SELECT
            id,
            company_id,
            helper_id,
            document_type,
            document_number,
            document_url,
            issue_date,
            expiry_date,
            status,
            created_at,
            updated_at
        FROM helper_documents
        WHERE company_id = ?
    `;

    const params = [companyId];

    if (helperId) {
        query += ` AND helper_id = ?`;
        params.push(helperId);
    }

    query += ` ORDER BY id DESC`;

    const [rows] = await db.execute(query, params);

    return rows;
};

const createHelperDocument = async (
    companyId,
    helperId,
    documentType,
    documentNumber,
    documentUrl,
    issueDate,
    expiryDate,
    status
) => {
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
            documentType,
            documentNumber || null,
            documentUrl || null,
            issueDate || null,
            expiryDate || null,
            status || 1
        ]
    );

    return result.insertId;
};

module.exports = {
    getHelperDocuments,
    createHelperDocument
};
