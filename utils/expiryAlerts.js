const daysUntil = (expiryDate) => {
    const expiry = new Date(expiryDate);
    if (Number.isNaN(expiry.getTime())) {
        return null;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);

    return Math.round((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

const buildDocumentAlertMessage = (doc) => {
    const type = String(doc.document_type || "document").toUpperCase();
    const number = doc.document_number ? ` (${doc.document_number})` : "";
    const expiry = String(doc.expiry_date || "").slice(0, 10);
    const remaining = daysUntil(doc.expiry_date);

    if (remaining === null) {
        return `Please review your ${type}${number} document.`;
    }

    if (remaining < 0) {
        const overdue = Math.abs(remaining);
        return `Your ${type}${number} expired on ${expiry} (${overdue} day${
            overdue === 1 ? "" : "s"
        } ago). Please renew it.`;
    }

    if (remaining === 0) {
        return `Your ${type}${number} expires today (${expiry}). Please renew it.`;
    }

    return `Your ${type}${number} expires on ${expiry} (${remaining} day${
        remaining === 1 ? "" : "s"
    } remaining).`;
};

const buildStaffExpiryAlerts = (documents = [], days = 30) => {
    const items = (documents || []).map((doc) => ({
        id: doc.id,
        source: doc.source,
        document_type: doc.document_type,
        document_number: doc.document_number || null,
        expiry_date: String(doc.expiry_date || "").slice(0, 10),
        days_remaining: daysUntil(doc.expiry_date),
        message: buildDocumentAlertMessage(doc)
    }));

    if (!items.length) {
        return {
            has_alerts: false,
            days,
            count: 0,
            summary: null,
            alerts: []
        };
    }

    const expiredCount = items.filter((item) => item.days_remaining < 0).length;
    const dueSoonCount = items.length - expiredCount;

    let summary = `You have ${items.length} document alert${
        items.length === 1 ? "" : "s"
    } within the next ${days} days.`;

    if (expiredCount && dueSoonCount) {
        summary = `You have ${expiredCount} expired document${
            expiredCount === 1 ? "" : "s"
        } and ${dueSoonCount} document${
            dueSoonCount === 1 ? "" : "s"
        } expiring within ${days} days.`;
    } else if (expiredCount) {
        summary = `You have ${expiredCount} expired document${
            expiredCount === 1 ? "" : "s"
        }. Please renew them.`;
    }

    return {
        has_alerts: true,
        days,
        count: items.length,
        summary,
        alerts: items
    };
};

module.exports = {
    daysUntil,
    buildDocumentAlertMessage,
    buildStaffExpiryAlerts
};
