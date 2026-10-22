const db = require("../config/db");
const { paginatedSelect } = require("../utils/pagination");
const { toTinyIntStatus } = require("../utils/validation");

const getVehicleDocuments = async (companyId, vehicleId, pagination) => {
    const where = vehicleId
        ? "company_id = ? AND vehicle_id = ?"
        : "company_id = ?";
    const params = vehicleId ? [companyId, vehicleId] : [companyId];

    return paginatedSelect(db, {
        table: "vehicle_documents",
        columns: `id, company_id, vehicle_id, document_type, document_number,
                  document_url, issue_date, expiry_date, status, created_at, updated_at`,
        where,
        params,
        pagination
    });
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

module.exports = {
    getVehicleDocuments,
    createVehicleDocument
};
