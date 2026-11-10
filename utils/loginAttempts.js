

const { HttpError } = require("./httpError");

const WINDOW_MS = 15 * 60 * 1000;

const createLimiter = ({ windowMs = WINDOW_MS, max, message }) => {
    const records = new Map();

    const active = (key) => {
        const record = records.get(key);

        if (!record) {
            return null;
        }

        if (Date.now() - record.start >= windowMs) {
            records.delete(key);
            return null;
        }

        return record;
    };

    setInterval(() => {
        for (const key of records.keys()) {
            active(key);
        }
    }, windowMs).unref?.();

    return {
        assert(key) {
            const record = active(key);

            if (record && record.count >= max) {
                throw new HttpError(429, message);
            }
        },
        fail(key) {
            const record = active(key);

            if (!record) {
                records.set(key, { count: 1, start: Date.now() });
                return;
            }

            record.count += 1;
        },
        clear(key) {
            records.delete(key);
        }
    };
};

const identifierOf = (req, identifier) =>
    String(
        identifier ??
            req.body?.identifier ??
            req.body?.email ??
            req.body?.mobile ??
            ""
    )
        .trim()
        .toLowerCase();

// Login: IP + identifier par 5 fail, aur sirf identifier par 10 fail
// (alag-alag IP se brute force rokne ke liye).
const loginByIp = createLimiter({
    max: 5,
    message: "Too many login attempts. Try again in 15 minutes"
});
const loginById = createLimiter({
    max: 10,
    message: "Too many login attempts. Try again in 15 minutes"
});

const assertNotLocked = (req, identifier) => {
    const id = identifierOf(req, identifier);

    loginByIp.assert(`${req.ip}:${id}`);
    loginById.assert(id);
};

const recordFailure = (req, identifier) => {
    const id = identifierOf(req, identifier);

    loginByIp.fail(`${req.ip}:${id}`);
    loginById.fail(id);
};

const clearFailures = (req, identifier) => {
    loginByIp.clear(`${req.ip}:${identifierOf(req, identifier)}`);
};

// OTP request: har request count hoti hai (SMS bombing rokne ke liye)
const otpRequestLimiter = createLimiter({
    max: 10,
    message: "Too many OTP requests. Try again later"
});

// OTP verify / reset: IP + mobile par galat attempts
const otpVerifyLimiter = createLimiter({
    max: 10,
    message: "Too many attempts. Try again in 15 minutes"
});

// Password change: user id par galat current password
const passwordChangeLimiter = createLimiter({
    max: 5,
    message: "Too many attempts. Try again in 15 minutes"
});

module.exports = {
    createLimiter,
    assertNotLocked,
    recordFailure,
    clearFailures,
    otpRequestLimiter,
    otpVerifyLimiter,
    passwordChangeLimiter
};