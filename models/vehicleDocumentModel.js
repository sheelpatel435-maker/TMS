const db = require("../config/db");

const getVehicleDocuments = async (companyId, vehicleId = null) => {
    let query = `
        SELECT
            id,
            company_id,
            vehicle_id,
            document_type,
            document_number,
            document_url,
            issue_date,
            expiry_date,
            status,
            created_at,
            updated_at
        FROM vehicle_documents
        WHERE company_id = ?
    `;

    const params = [companyId];

    if (vehicleId) {
        query += ` AND vehicle_id = ?`;
        params.push(vehicleId);
    }

    query += ` ORDER BY id DESC`;

    const [rows] = await db.execute(query, params);

    return rows;
};

const createVehicleDocument = async (
    companyId,
    vehicleId,
    documentType,
    documentNumber,
    documentUrl,
    issueDate,
    expiryDate,
    status
) => {
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
    getVehicleDocuments,
    createVehicleDocument
};
