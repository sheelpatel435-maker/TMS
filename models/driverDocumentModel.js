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

module.exports = {
    getDriverDocuments,
    createDriverDocument
};
