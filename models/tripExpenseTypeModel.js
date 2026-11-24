const db = require("../config/db");

const DEFAULT_TYPES = [
    { code: "FUEL", name: "Fuel" },
    { code: "TOLL", name: "Toll" },
    { code: "FOOD", name: "Food" },
    { code: "PARKING", name: "Parking" },
    { code: "REPAIR", name: "Repair" },
    { code: "LOADING", name: "Loading/Unloading" },
    { code: "DETENTION", name: "Detention" },
    { code: "OTHER", name: "Other" }
];

const ensureDefaults = async (companyId, executor = db) => {
    for (const row of DEFAULT_TYPES) {
        await executor.execute(
            `INSERT IGNORE INTO trip_expense_types (company_id, name, code, status)
             VALUES (?, ?, ?, 1)`,
            [companyId, row.name, row.code]
        );
    }
};

const listTypes = async (companyId, executor = db) => {
    await ensureDefaults(companyId, executor);
    const [rows] = await executor.execute(
        `SELECT id, company_id, name, code, status, created_at, updated_at
         FROM trip_expense_types
         WHERE company_id = ? AND status = 1
         ORDER BY name ASC`,
        [companyId]
    );
    return rows;
};

const createType = async (companyId, { name, code }, executor = db) => {
    const cleanName = String(name || "").trim();
    const cleanCode = String(code || cleanName)
        .trim()
        .toUpperCase()
        .replace(/[\s-]+/g, "_");
    if (!cleanName || !cleanCode) {
        throw new Error("name and code are required");
    }

    const [result] = await executor.execute(
        `INSERT INTO trip_expense_types (company_id, name, code, status)
         VALUES (?, ?, ?, 1)`,
        [companyId, cleanName.slice(0, 80), cleanCode.slice(0, 40)]
    );
    return result.insertId;
};

const deactivateType = async (id, companyId, executor = db) => {
    const [result] = await executor.execute(
        `UPDATE trip_expense_types
         SET status = 0
         WHERE id = ? AND company_id = ? AND status = 1`,
        [id, companyId]
    );
    return result.affectedRows;
};

const isAllowedType = async (companyId, expenseType, executor = db) => {
    await ensureDefaults(companyId, executor);
    const code = String(expenseType || "")
        .trim()
        .toUpperCase()
        .replace(/[\s-]+/g, "_");
    const [rows] = await executor.execute(
        `SELECT id FROM trip_expense_types
         WHERE company_id = ? AND status = 1
           AND (code = ? OR UPPER(name) = ?)
         LIMIT 1`,
        [companyId, code, code]
    );
    return Boolean(rows[0]);
};

module.exports = {
    DEFAULT_TYPES,
    ensureDefaults,
    listTypes,
    createType,
    deactivateType,
    isAllowedType
};
