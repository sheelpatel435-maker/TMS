const { HttpError } = require("./httpError");

const VEHICLE_STATUSES = Object.freeze({
    INACTIVE: 0,
    ACTIVE: 1,
    MAINTENANCE: 2
});

const DOCUMENT_TYPES = new Set([
    "RC",
    "INSURANCE",
    "FITNESS",
    "PERMIT",
    "PUC",
    "ROAD_TAX"
]);

const positiveInteger = (value, fieldName) => {
    if (
        (typeof value !== "string" && typeof value !== "number") ||
        !/^[1-9]\d*$/.test(String(value))
    ) {
        throw new HttpError(400, `${fieldName} must be a positive integer`);
    }

    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed)) {
        throw new HttpError(400, `${fieldName} must be a positive integer`);
    }

    return parsed;
};

const vehicleStatus = (value, fallback = VEHICLE_STATUSES.ACTIVE) => {
    if (value === undefined || value === null || value === "") {
        return fallback;
    }

    if (typeof value === "boolean") {
        return value ? VEHICLE_STATUSES.ACTIVE : VEHICLE_STATUSES.INACTIVE;
    }

    if (typeof value === "number" && [0, 1, 2].includes(value)) {
        return value;
    }

    if (typeof value === "string") {
        const normalized = value.trim().toUpperCase();
        if (/^[012]$/.test(normalized)) {
            return Number(normalized);
        }
        if (normalized === "FALSE" || normalized === "NO") {
            return VEHICLE_STATUSES.INACTIVE;
        }
        if (normalized === "TRUE" || normalized === "YES") {
            return VEHICLE_STATUSES.ACTIVE;
        }
        if (Object.prototype.hasOwnProperty.call(VEHICLE_STATUSES, normalized)) {
            return VEHICLE_STATUSES[normalized];
        }
    }

    throw new HttpError(400, "status must be active, inactive, or maintenance");
};

const optionalBoolean = (value, fieldName, fallback = 1) => {
    if (value === undefined || value === null || value === "") {
        return fallback;
    }
    if (value === true || value === 1 || value === "1") {
        return 1;
    }
    if (value === false || value === 0 || value === "0") {
        return 0;
    }
    if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (normalized === "true" || normalized === "active") return 1;
        if (normalized === "false" || normalized === "inactive") return 0;
    }

    throw new HttpError(400, `${fieldName} must be true or false`);
};

const isoDate = (value, fieldName, optional = true) => {
    if (value === undefined || value === null || value === "") {
        if (optional) return null;
        throw new HttpError(400, `${fieldName} is required`);
    }

    const dateValue = value instanceof Date
        ? value.toISOString().slice(0, 10)
        : value;
    if (
        typeof dateValue !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(dateValue)
    ) {
        throw new HttpError(400, `${fieldName} must be a valid YYYY-MM-DD date`);
    }
    const [year, month, day] = dateValue.split("-").map(Number);
    const checkedDate = new Date(Date.UTC(year, month - 1, day));
    if (
        checkedDate.getUTCFullYear() !== year ||
        checkedDate.getUTCMonth() !== month - 1 ||
        checkedDate.getUTCDate() !== day
    ) {
        throw new HttpError(400, `${fieldName} must be a valid YYYY-MM-DD date`);
    }
    return dateValue;
};

const documentType = (value) => {
    if (typeof value !== "string") {
        throw new HttpError(400, "Document type is required");
    }

    const normalized = value.trim().toUpperCase().replace(/[\s-]+/g, "_");
    if (!/^[A-Z][A-Z0-9_]{0,49}$/.test(normalized)) {
        throw new HttpError(400, "document_type must be a valid name up to 50 characters");
    }
    return normalized;
};

const validateDocumentDates = (issueDate, expiryDate) => {
    const issue = isoDate(issueDate, "issue_date");
    const expiry = isoDate(expiryDate, "expiry_date");
    if (issue && expiry && expiry < issue) {
        throw new HttpError(400, "expiry_date must be on or after issue_date");
    }
    return { issue_date: issue, expiry_date: expiry };
};

module.exports = {
    VEHICLE_STATUSES,
    DOCUMENT_TYPES,
    positiveInteger,
    vehicleStatus,
    optionalBoolean,
    isoDate,
    documentType,
    validateDocumentDates
};
