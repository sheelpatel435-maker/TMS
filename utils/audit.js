

const auditLogModel = require("../models/auditLogModel");

const pick = (value, fallback) => (value !== undefined ? value : fallback);

const writeAudit = async (
    req,
    action,
    entityType,
    entityId,
    description,
    context = {}
) => {
    try {
        await auditLogModel.insertAudit({
            company_id: pick(context.companyId, req.user?.company_id) || null,
            user_id: pick(context.userId, req.user?.id) || null,
            action,
            entity_type: entityType || null,
            entity_id: entityId || null,
            description: description ? String(description).slice(0, 500) : null,
           
            ip_address: req.ip ? String(req.ip).slice(0, 45) : null
        });
    } catch (error) {
        console.error("AUDIT LOG ERROR:", error);
    }
};

module.exports = {
    writeAudit
};