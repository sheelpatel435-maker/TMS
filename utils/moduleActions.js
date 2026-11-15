/**
 * BRD §3.2 — Company User module/action checklist (no Roles UI).
 * View | Create/Edit | Approve/Other
 */
const MODULE_ACTIONS = Object.freeze({
    Vehicles: Object.freeze([
        "can_view",
        "can_create",
        "can_update",
        "can_delete",
        "can_export",
        "can_approve"
    ]),
    "Drivers & Helpers": Object.freeze([
        "can_view",
        "can_create",
        "can_update",
        "can_delete",
        "can_export"
    ]),
    Bilty: Object.freeze([
        "can_view",
        "can_create",
        "can_update",
        "can_delete"
    ]),
    Trips: Object.freeze([
        "can_view",
        "can_create",
        "can_update",
        "can_delete",
        "can_dispatch",
        "can_close",
        "can_approve"
    ]),
    "Trip Expenses": Object.freeze([
        "can_view",
        "can_create",
        "can_update",
        "can_approve"
    ]),
    "Trip Settlement": Object.freeze([
        "can_view",
        "can_create",
        "can_approve"
    ]),
    Clients: Object.freeze([
        "can_view",
        "can_create",
        "can_update",
        "can_delete"
    ]),
    Invoices: Object.freeze([
        "can_view",
        "can_create",
        "can_update",
        "can_delete",
        "can_approve"
    ]),
    Payments: Object.freeze([
        "can_view",
        "can_create",
        "can_approve"
    ]),
    Reports: Object.freeze(["can_view", "can_export"]),
    "Audit Logs": Object.freeze(["can_view"])
});

const MODULE_ALIASES = Object.freeze({
    Drivers: "Drivers & Helpers",
    Helpers: "Drivers & Helpers",
    Bilties: "Bilty",
    Documents: "Vehicles",
    "Vehicle Types": "Vehicles",
    "Vehicle Assignments": "Vehicles"
});

const normalizeModuleName = (name) => MODULE_ALIASES[name] || name;

module.exports = {
    MODULE_ACTIONS,
    MODULE_ALIASES,
    normalizeModuleName
};
