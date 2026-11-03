const db = require("../config/db");
const { paginatedSelect } = require("../utils/pagination");
const { toTinyIntStatus } = require("../utils/validation");

const getDriverDocuments = async (companyId, driverId, pagination) => {
    const where = driverId
        ? "company_id = ? AND driver_id = ?"
        : "company_id = ?";
    const params = driverId ? [companyId, driverId] : [companyId];

    return paginatedSelect(db, {
        table: "driver_documents",
        columns: "*",
        where,
        params,
        pagination
    });
};

const getDriverDocumentById = async (id, companyId) => {
    const [rows] = await db.execute(
        `SELECT *
         FROM driver_documents
         WHERE id = ? AND company_id = ?
         LIMIT 1`,
        [id, companyId]
    );

    return rows[0] || null;
};

const createDriverDocument = async (companyId, driverId, data) => {
    const [result] = await db.execute(
        `INSERT INTO driver_documents
        (company_id, driver_id, document_type, document_number,
         document_url, issue_date, expiry_date, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            companyId,
            driverId,
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

const updateDriverDocument = async (id, companyId, data) => {
    const [result] = await db.execute(
        `UPDATE driver_documents
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

const deactivateDriverDocument = async (id, companyId) => {
    const [result] = await db.execute(
        `UPDATE driver_documents
         SET status = 0
         WHERE id = ? AND company_id = ?`,
        [id, companyId]
    );

    return result.affectedRows;
};

module.exports = {
    getDriverDocuments,
    getDriverDocumentById,
    createDriverDocument,
    updateDriverDocument,
    deactivateDriverDocument
};
