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
    },
    // BRD: RESERVED → DRAFT → CONFIRMED/USED → CANCELLED
    // CREATED/COMPLETED kept for legacy rows
    bilty: {
        RESERVED: ["DRAFT", "CREATED", "CANCELLED"],
        DRAFT: ["CONFIRMED", "USED", "CANCELLED"],
        CREATED: ["CONFIRMED", "USED", "DRAFT", "CANCELLED", "COMPLETED"],
        CONFIRMED: ["USED", "CANCELLED"],
        USED: [],
        COMPLETED: [],
        CANCELLED: []
    },
    // BRD lifecycle + legacy CREATED/COMPLETED aliases
    trip: {
        DRAFT: ["BILTY_LINKED", "READY_FOR_DISPATCH", "DISPATCHED", "CANCELLED"],
        CREATED: ["BILTY_LINKED", "READY_FOR_DISPATCH", "DISPATCHED", "CANCELLED"],
        BILTY_LINKED: ["READY_FOR_DISPATCH", "DISPATCHED", "CANCELLED"],
        READY_FOR_DISPATCH: ["DISPATCHED", "CANCELLED"],
        DISPATCHED: ["IN_TRANSIT", "CANCELLED"],
        IN_TRANSIT: ["DELIVERED", "CANCELLED"],
        DELIVERED: ["FINAL_REPORT_SUBMITTED", "COMPLETED", "CANCELLED"],
        FINAL_REPORT_SUBMITTED: ["VERIFIED", "CANCELLED"],
        VERIFIED: ["CLOSED", "COMPLETED"],
        COMPLETED: ["CLOSED"],
        CLOSED: [],
        CANCELLED: []
    }
};

const normalizeStatus = (entity, status) => {
    if (!status) {
        return status;
    }

    const value = String(status).trim().toUpperCase().replace(/\s+/g, "_");

    if (entity === "bilty") {
        if (value === "CONFIRMED/USED") {
            return "CONFIRMED";
        }
    }

    if (entity === "trip") {
        if (value === "IN TRANSIT") {
            return "IN_TRANSIT";
        }
        if (value === "FINAL REPORT SUBMITTED") {
            return "FINAL_REPORT_SUBMITTED";
        }
        if (value === "READY FOR DISPATCH") {
            return "READY_FOR_DISPATCH";
        }
        if (value === "BILTY LINKED") {
            return "BILTY_LINKED";
        }
    }

    return value;
};

const assertTransition = (entity, fromStatus, toStatus) => {
    const map = TRANSITIONS[entity];

    if (!map) {
        throw new Error(`Unknown status entity: ${entity}`);
    }

    const next = normalizeStatus(entity, toStatus);
    const current = normalizeStatus(entity, fromStatus) || Object.keys(map)[0];

    if (!Object.prototype.hasOwnProperty.call(map, next)) {
        throw new HttpError(400, `Invalid ${entity} status`);
    }

    const allowed = map[current] || [];

    if (current === next) {
        return true;
    }

    if (!allowed.includes(next)) {
        throw new HttpError(
            400,
            `Cannot change ${entity} status from ${current} to ${next}`
        );
    }

    return true;
};

const isAllowedStatus = (entity, status) => {
    const normalized = normalizeStatus(entity, status);
    return Object.prototype.hasOwnProperty.call(
        TRANSITIONS[entity] || {},
        normalized
    );
};

module.exports = {
    TRANSITIONS,
    normalizeStatus,
    assertTransition,
    isAllowedStatus
};
