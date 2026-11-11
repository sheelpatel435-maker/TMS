const { HttpError } = require("./httpError");

const normalizeMobile = (value) => {
    let mobile = String(value || "").trim();
    mobile = mobile.replace(/[\s-]/g, "");

    if (mobile.startsWith("+91")) {
        mobile = mobile.slice(3);
    }

    return mobile.replace(/\+/g, "");
};

const validateMobile = (value) => /^\d{10,15}$/.test(normalizeMobile(value));

const validateEmail = (value) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());

const requireValidMobile = (value) => {
    const mobile = normalizeMobile(value);

    if (!validateMobile(mobile)) {
        throw new HttpError(400, "A valid mobile number with 10 to 15 digits is required");
    }

    return mobile;
};

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();

const requireValidEmail = (value) => {
    const email = normalizeEmail(value);

    if (email && !validateEmail(email)) {
        throw new HttpError(400, "A valid email address is required");
    }

    return email || null;
};

module.exports = {
    normalizeMobile,
    validateMobile,
    requireValidMobile,
    normalizeEmail,
    validateEmail,
    requireValidEmail
};
