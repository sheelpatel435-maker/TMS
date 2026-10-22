const db = require("../config/db");
const { HttpError } = require("./httpError");

const TABLES = {
    vehicles: "vehicles",
    drivers: "drivers",
    helpers: "helpers",
    clients: "clients",
    bilties: "bilties",
    trips: "trips",
    invoices: "invoices",
    invoice_payments: "invoice_payments",
    invoice_payment_deductions: "invoice_payment_deductions",
    trip_advances: "trip_advances",
    trip_expenses: "trip_expenses",
    trip_settlements: "trip_settlements",
    trip_final_reports: "trip_final_reports",
    vehicle_types: "vehicle_types",
    module_definitions: "module_definitions",
    users: "users"
};

const getById = async (tableKey, id) => {
    const table = TABLES[tableKey];

    if (!table) {
        throw new Error("Invalid table");
    }

    const [rows] = await db.execute(
        `SELECT * FROM ${table} WHERE id = ? LIMIT 1`,
        [id]
    );

    return rows[0] || null;
};

const assertOwned = async (tableKey, id, companyId, label) => {
    if (id === undefined || id === null || id === "") {
        return null;
    }

    const table = TABLES[tableKey];

    if (!table) {
        throw new Error("Invalid table");
    }

    const name = label || tableKey.replace(/_/g, " ");

    if (tableKey === "vehicle_types" || tableKey === "module_definitions") {
        const row = await getById(tableKey, id);

        if (!row) {
            throw new HttpError(400, `${name} not found`);
        }

        return row;
    }

    const [rows] = await db.execute(
        `SELECT * FROM ${table} WHERE id = ? AND company_id = ? LIMIT 1`,
        [id, companyId]
    );

    if (!rows[0]) {
        throw new HttpError(400, `${name} not found for this company`);
    }

    return rows[0];
};

const assertOwnedUser = async (userId, companyId, { allowSuperAdmin = false } = {}) => {
    const user = await getById("users", userId);

    if (!user) {
        throw new HttpError(400, "User not found");
    }

    if (allowSuperAdmin && user.user_type === "SUPER_ADMIN") {
        return user;
    }

    if (Number(user.company_id) !== Number(companyId)) {
        throw new HttpError(403, "User does not belong to this company");
    }

    return user;
};

module.exports = {
    TABLES,
    getById,
    assertOwned,
    assertOwnedUser
};
