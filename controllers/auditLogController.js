const auditLogModel = require("../models/auditLogModel");
const { parsePagination } = require("../utils/pagination");
const { sendError } = require("../utils/httpError");
const { isSuperAdmin } = require("../utils/roles");
const { resolveCompanyId } = require("../utils/companyScope");

const getAuditLogs = async (req, res) => {
    try {
        const companyId = isSuperAdmin(req.user) && !req.query.company_id
            ? null
            : resolveCompanyId(req);

        const { rows: logs, pagination } = await auditLogModel.getAuditLogs(
            companyId,
            parsePagination(req.query)
        );

        return res.status(200).json({
            success: true,
            logs,
            pagination
        });
    } catch (error) {
        return sendError(res, error);
    }
};

module.exports = {
    getAuditLogs
};
