const db = require("../config/db");
const documentExpiryModel = require("../models/documentExpiryModel");
const { sendError } = require("../utils/httpError");
const { resolveCompanyId } = require("../utils/companyScope");

const countRows = async (table, companyId) => {
    const [rows] = await db.execute(
        `SELECT COUNT(*) AS total FROM ${table} WHERE company_id = ?`,
        [companyId]
    );

    return Number(rows[0].total);
};

const getDashboard = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const expiring = await documentExpiryModel.getExpiringDocuments(companyId, 30);

        return res.status(200).json({
            success: true,
            stats: {
                vehicles: await countRows("vehicles", companyId),
                drivers: await countRows("drivers", companyId),
                helpers: await countRows("helpers", companyId),
                clients: await countRows("clients", companyId),
                bilties: await countRows("bilties", companyId),
                trips: await countRows("trips", companyId),
                invoices: await countRows("invoices", companyId),
                expiring_documents: expiring.length
            }
        });
    } catch (error) {
        return sendError(res, error);
    }
};

module.exports = {
    getDashboard
};
