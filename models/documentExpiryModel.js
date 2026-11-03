const db = require("../config/db");

const getExpiringDocuments = async (companyId, days = 30) => {
    const horizon = Number(days) || 30;

    const [vehicleDocs] = await db.execute(
        `SELECT 'vehicle' AS source, id, company_id, vehicle_id AS owner_id,
                document_type, document_number, document_url, expiry_date
         FROM vehicle_documents
         WHERE company_id = ?
         AND status = 1
         AND expiry_date IS NOT NULL
         AND expiry_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY)`,
        [companyId, horizon]
    );

    const [driverDocs] = await db.execute(
        `SELECT 'driver' AS source, id, company_id, driver_id AS owner_id,
                document_type, document_number, document_url, expiry_date
         FROM driver_documents
         WHERE company_id = ?
         AND status = 1
         AND expiry_date IS NOT NULL
         AND expiry_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY)`,
        [companyId, horizon]
    );

    const [helperDocs] = await db.execute(
        `SELECT 'helper' AS source, id, company_id, helper_id AS owner_id,
                document_type, document_number, document_url, expiry_date
         FROM helper_documents
         WHERE company_id = ?
         AND status = 1
         AND expiry_date IS NOT NULL
         AND expiry_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY)`,
        [companyId, horizon]
    );

    return [...vehicleDocs, ...driverDocs, ...helperDocs].sort((a, b) =>
        String(a.expiry_date).localeCompare(String(b.expiry_date))
    );
};

module.exports = {
    getExpiringDocuments
};
