const db = require("../config/db");

const getDriverDocuments = async (companyId, driverId) => {
    const [rows] = await db.execute(
        `SELECT *
         FROM driver_documents
         WHERE company_id = ?
         AND driver_id = ?
         ORDER BY id DESC`,
        [companyId, driverId]
    );

    return rows;
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
            data.status || "ACTIVE"
        ]
    );

    return result.insertId;
};

module.exports = {
    getDriverDocuments,
    createDriverDocument
};