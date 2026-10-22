const { HttpError } = require("./httpError");

const isMissing = (value) =>
    value === undefined || value === null || value === "";

const toNumber = (value) => {
    if (typeof value === "number") {
        return value;
    }

    if (typeof value === "string" && value.trim() === "") {
        return NaN;
    }

    return Number(value);
};

const isValidAmount = (value) => {
    if (isMissing(value)) {
        return false;
    }

    const amount = toNumber(value);
    return Number.isFinite(amount) && amount >= 0;
};

const isPositiveAmount = (value) => {
    if (!isValidAmount(value)) {
        return false;
    }

    return toNumber(value) > 0;
};

const requirePositiveAmount = (value, fieldName) => {
    if (!isPositiveAmount(value)) {
        throw new HttpError(400, `${fieldName} must be a number greater than 0`);
    }

    return toNumber(value);
};

const requireNonNegativeAmount = (value, fieldName) => {
    if (!isValidAmount(value)) {
        throw new HttpError(400, `${fieldName} must be a valid amount`);
    }

    return toNumber(value);
};

const roundMoney = (value) =>
    Math.round((toNumber(value) + Number.EPSILON) * 100) / 100;

const toTinyIntStatus = (value, fallback = 1) => {
    if (value === undefined || value === null || value === "") {
        return fallback;
    }

    const numeric = toNumber(value);

    if (numeric === 0 || numeric === 1) {
        return numeric;
    }

    if (typeof value === "string") {
        const normalized = value.trim().toUpperCase();

        if (["ACTIVE", "TRUE", "YES"].includes(normalized)) {
            return 1;
        }

        if (["INACTIVE", "FALSE", "NO"].includes(normalized)) {
            return 0;
        }
    }

    return fallback;
};

const firstPresent = (...values) => {
    for (const value of values) {
        if (!isMissing(value)) {
            return value;
        }
    }

    return undefined;
};

module.exports = {
    isMissing,
    toNumber,
    isValidAmount,
    isPositiveAmount,
    requirePositiveAmount,
    requireNonNegativeAmount,
    roundMoney,
    toTinyIntStatus,
    firstPresent
};
