const { HttpError } = require("./httpError");

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const attempts = new Map();

const keyFor = (req) =>
    `${req.ip}:${String(req.body?.email || "").trim().toLowerCase()}`;

const pruneExpired = () => {
    const now = Date.now();

    for (const [key, record] of attempts.entries()) {
        if (now - record.start >= WINDOW_MS) {
            attempts.delete(key);
        }
    }
};

setInterval(pruneExpired, WINDOW_MS).unref?.();

const assertNotLocked = (req) => {
    pruneExpired();
    const record = attempts.get(keyFor(req));

    if (
        record &&
        Date.now() - record.start < WINDOW_MS &&
        record.count >= MAX_ATTEMPTS
    ) {
        throw new HttpError(
            429,
            "Too many login attempts. Try again in 15 minutes"
        );
    }
};

const recordFailure = (req) => {
    const key = keyFor(req);
    const now = Date.now();
    const record = attempts.get(key);

    if (!record || now - record.start >= WINDOW_MS) {
        attempts.set(key, { count: 1, start: now });
        return;
    }

    record.count += 1;
};

const clearFailures = (req) => {
    attempts.delete(keyFor(req));
};

module.exports = {
    assertNotLocked,
    recordFailure,
    clearFailures
};
