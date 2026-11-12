const db = require("../config/db");
const { paginatedSelect } = require("../utils/pagination");
const { optionalBoolean } = require("../utils/vehicleValidation");

const DOC_COLUMNS = `id, company_id, vehicle_id, document_type, document_number,
                  document_url, issue_date, expiry_date, status,
                  verification_status, created_at, updated_at`;

const getDocumentTypes = async (companyId) => {
    const [rows] = await db.execute(
        `SELECT NULL AS id, ? AS company_id, 'RC' AS name, 1 AS is_system, 1 AS status
         UNION ALL SELECT NULL, ?, 'INSURANCE', 1, 1
         UNION ALL SELECT NULL, ?, 'FITNESS', 1, 1
         UNION ALL SELECT NULL, ?, 'PERMIT', 1, 1
         UNION ALL SELECT NULL, ?, 'PUC', 1, 1
         UNION ALL SELECT NULL, ?, 'ROAD_TAX', 1, 1
         UNION ALL
         SELECT id, company_id, name, 0 AS is_system, status
         FROM vehicle_document_types
         WHERE company_id = ? AND status = 1
         ORDER BY is_system DESC, name ASC`,
        [companyId, companyId, companyId, companyId, companyId, companyId, companyId]
    );
    return rows;
};

const getDocumentType = async (companyId, name) => {
    const [rows] = await db.execute(
        `SELECT id, name
         FROM vehicle_document_types
         WHERE company_id = ? AND name = ? AND status = 1
         LIMIT 1`,
        [companyId, name]
    );
    return rows[0] || null;
};

const createDocumentType = async (companyId, name) => {
    const [result] = await db.execute(
        `INSERT INTO vehicle_document_types (company_id, name, status)
         VALUES (?, ?, 1)`,
        [companyId, name]
    );
    return result.insertId;
};

const deactivateDocumentType = async (id, companyId) => {
    const [result] = await db.execute(
        `UPDATE vehicle_document_types
         SET status = 0
         WHERE id = ? AND company_id = ?`,
        [id, companyId]
    );
    return result.affectedRows;
};

const updateVerificationStatus = async (id, companyId, verificationStatus, executor = db) => {
    const [result] = await executor.execute(
        `UPDATE vehicle_documents
         SET verification_status = ?
         WHERE id = ? AND company_id = ?`,
        [verificationStatus, id, companyId]
    );
    return result.affectedRows;
};

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

const createVehicleDocument = async (companyId, vehicleId, data, executor = db) => {
    const [result] = await executor.execute(
        `INSERT INTO vehicle_documents
        (
            company_id,
            vehicle_id,
            document_type,
            document_number,
            document_url,
            issue_date,
            expiry_date,
            status,
            verification_status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            companyId,
            vehicleId,
            data.document_type,
            data.document_number || null,
            data.document_url || null,
            data.issue_date || null,
            data.expiry_date || null,
            optionalBoolean(data.status, "status", 1),
            data.verification_status || "PENDING"
        ]
    );

    return result.insertId;
};

const updateVehicleDocument = async (id, companyId, data, executor = db) => {
    const [result] = await executor.execute(
        `UPDATE vehicle_documents
         SET document_type = ?,
             document_number = ?,
             document_url = ?,
             issue_date = ?,
             expiry_date = ?,
             status = ?,
             verification_status = ?
         WHERE id = ? AND company_id = ?`,
        [
            data.document_type,
            data.document_number || null,
            data.document_url || null,
            data.issue_date || null,
            data.expiry_date || null,
            optionalBoolean(data.status, "status", 1),
            data.verification_status,
            id,
            companyId
        ]
    );

    return result.affectedRows;
};

const deactivateVehicleDocument = async (id, companyId, executor = db) => {
    const [result] = await executor.execute(
        `UPDATE vehicle_documents
         SET status = 0
         WHERE id = ? AND company_id = ?`,
        [id, companyId]
    );

    return result.affectedRows;
};

module.exports = {
    getDocumentTypes,
    getDocumentType,
    createDocumentType,
    deactivateDocumentType,
    getVehicleDocuments,
    getVehicleDocumentById,
    createVehicleDocument,
    updateVehicleDocument,
    updateVerificationStatus,
    deactivateVehicleDocument
};
