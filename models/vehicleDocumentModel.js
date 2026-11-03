const db = require("../config/db");
const { paginatedSelect } = require("../utils/pagination");
const { toTinyIntStatus } = require("../utils/validation");

const DOC_COLUMNS = `id, company_id, vehicle_id, document_type, document_number,
                  document_url, issue_date, expiry_date, status, created_at, updated_at`;

const getVehicleDocuments = async (companyId, vehicleId, pagination) => {
    const where = vehicleId
        ? "company_id = ? AND vehicle_id = ?"
        : "company_id = ?";
    const params = vehicleId ? [companyId, vehicleId] : [companyId];

    return paginatedSelect(db, {
        table: "vehicle_documents",
        columns: DOC_COLUMNS,
        where,
        params,
        pagination
    });
};

const getVehicleDocumentById = async (id, companyId) => {
    const [rows] = await db.execute(
        `SELECT ${DOC_COLUMNS}
         FROM vehicle_documents
         WHERE id = ? AND company_id = ?
         LIMIT 1`,
        [id, companyId]
    );

    return rows[0] || null;
};

const createVehicleDocument = async (companyId, vehicleId, data) => {
    const [result] = await db.execute(
        `INSERT INTO vehicle_documents
        (
            company_id,
            vehicle_id,
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
            vehicleId,
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

const updateVehicleDocument = async (id, companyId, data) => {
    const [result] = await db.execute(
        `UPDATE vehicle_documents
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

const deactivateVehicleDocument = async (id, companyId) => {
    const [result] = await db.execute(
        `UPDATE vehicle_documents
         SET status = 0
         WHERE id = ? AND company_id = ?`,
        [id, companyId]
    );

    return result.affectedRows;
};

module.exports = {
    getVehicleDocuments,
    getVehicleDocumentById,
    createVehicleDocument,
    updateVehicleDocument,
    deactivateVehicleDocument
};
