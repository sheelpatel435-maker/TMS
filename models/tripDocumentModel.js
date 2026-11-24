const db = require("../config/db");
const { paginatedSelect } = require("../utils/pagination");

const COLUMNS = `id, company_id, trip_id, document_type, document_url, remarks,
                 uploaded_by, status, created_at, updated_at`;

const getByTrip = async (companyId, tripId, pagination) =>
    paginatedSelect(db, {
        table: "trip_documents",
        columns: COLUMNS,
        where: "company_id = ? AND trip_id = ? AND status = 1",
        params: [companyId, tripId],
        pagination
    });

const getById = async (id, companyId, executor = db) => {
    const [rows] = await executor.execute(
        `SELECT ${COLUMNS}
         FROM trip_documents
         WHERE id = ? AND company_id = ?
         LIMIT 1`,
        [id, companyId]
    );
    return rows[0] || null;
};

const create = async (companyId, data, executor = db) => {
    const [result] = await executor.execute(
        `INSERT INTO trip_documents
         (company_id, trip_id, document_type, document_url, remarks, uploaded_by, status)
         VALUES (?, ?, ?, ?, ?, ?, 1)`,
        [
            companyId,
            data.trip_id,
            data.document_type,
            data.document_url,
            data.remarks || null,
            data.uploaded_by || null
        ]
    );
    return result.insertId;
};

const deactivate = async (id, companyId, executor = db) => {
    const [result] = await executor.execute(
        `UPDATE trip_documents
         SET status = 0
         WHERE id = ? AND company_id = ? AND status = 1`,
        [id, companyId]
    );
    return result.affectedRows;
};

module.exports = {
    getByTrip,
    getById,
    create,
    deactivate
};
