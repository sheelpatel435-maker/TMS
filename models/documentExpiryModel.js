const db = require("../config/db");
const { buildMeta } = require("../utils/pagination");

const getExpiringDocuments = async (companyId, days = 30, pagination = { page: 1, limit: 20, offset: 0 }) => {
    const horizon = days === undefined || days === null ? 30 : Number(days);
    const unionSql = `
        SELECT 'vehicle' AS source, id, company_id, vehicle_id AS owner_id,
               document_type, document_number, document_url, expiry_date
        FROM vehicle_documents
        WHERE company_id = ? AND status = 1 AND expiry_date IS NOT NULL
          AND expiry_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
        UNION ALL
        SELECT 'driver' AS source, id, company_id, driver_id AS owner_id,
               document_type, document_number, document_url, expiry_date
        FROM driver_documents
        WHERE company_id = ? AND status = 1 AND expiry_date IS NOT NULL
          AND expiry_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
        UNION ALL
        SELECT 'helper' AS source, id, company_id, helper_id AS owner_id,
               document_type, document_number, document_url, expiry_date
        FROM helper_documents
        WHERE company_id = ? AND status = 1 AND expiry_date IS NOT NULL
          AND expiry_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
    `;
    const params = [companyId, horizon, companyId, horizon, companyId, horizon];

    const [countRows] = await db.execute(
        `SELECT COUNT(*) AS total FROM (${unionSql}) expiring_documents`,
        params
    );
    const [rows] = await db.execute(
        `SELECT source, id, company_id, owner_id, document_type,
                document_number, document_url, expiry_date
         FROM (${unionSql}) expiring_documents
         ORDER BY expiry_date ASC, source ASC, id ASC
         LIMIT ? OFFSET ?`,
        [...params, pagination.limit, pagination.offset]
    );
    const total = Number(countRows[0]?.total || 0);

    return {
        rows,
        pagination: buildMeta(pagination.page, pagination.limit, total)
    };
};

module.exports = {
    getExpiringDocuments
};
