const auditLogModel = require("../models/auditLogModel");

const writeAudit = async (req, action, entityType, entityId, description) => {
    try {
        await auditLogModel.insertAudit({
            company_id: req.user?.company_id || null,
            user_id: req.user?.id || null,
            action,
            entity_type: entityType || null,
            entity_id: entityId || null,
            description: description || null,
            ip_address: req.ip || req.headers["x-forwarded-for"] || null
        });
    } catch (error) {
        console.error("AUDIT LOG ERROR:", error);
    }
};

module.exports = {
    writeAudit
};
