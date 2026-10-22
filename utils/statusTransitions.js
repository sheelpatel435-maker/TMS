const { HttpError } = require("./httpError");

const TRANSITIONS = {
    invoice: {
        DRAFT: ["SENT", "CANCELLED"],
        SENT: ["PARTIAL", "PAID", "CANCELLED"],
        PARTIAL: ["PAID", "CANCELLED"],
        PAID: ["CANCELLED"],
        CANCELLED: []
    },
    payment: {
        PENDING: ["CONFIRMED", "CANCELLED"],
        CONFIRMED: ["CANCELLED"],
        CANCELLED: [],
        REVERSED: []
    },
    settlement: {
        PENDING: ["SETTLED", "CARRY_FORWARD"],
        SETTLED: [],
        CARRY_FORWARD: ["SETTLED"]
    },
    advance: {
        PENDING: ["APPROVED", "CANCELLED"],
        APPROVED: ["PAID", "CANCELLED"],
        PAID: [],
        CANCELLED: []
    },
    expense: {
        PENDING: ["APPROVED", "REJECTED"],
        APPROVED: [],
        REJECTED: []
    },
    finalReport: {
        SUBMITTED: ["VERIFIED", "REJECTED"],
        VERIFIED: [],
        REJECTED: []
    }
};

const assertTransition = (entity, fromStatus, toStatus) => {
    const map = TRANSITIONS[entity];

    if (!map) {
        throw new Error(`Unknown status entity: ${entity}`);
    }

    if (!Object.prototype.hasOwnProperty.call(map, toStatus)) {
        throw new HttpError(400, `Invalid ${entity} status`);
    }

    const current = fromStatus || Object.keys(map)[0];
    const allowed = map[current] || [];

    if (current === toStatus) {
        return true;
    }

    if (!allowed.includes(toStatus)) {
        throw new HttpError(
            400,
            `Cannot change ${entity} status from ${current} to ${toStatus}`
        );
    }

    return true;
};

const isAllowedStatus = (entity, status) =>
    Object.prototype.hasOwnProperty.call(TRANSITIONS[entity] || {}, status);

module.exports = {
    TRANSITIONS,
    assertTransition,
    isAllowedStatus
};
