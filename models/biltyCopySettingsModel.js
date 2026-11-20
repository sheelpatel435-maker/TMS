const db = require("../config/db");

const DEFAULT_COPIES = Object.freeze([
    {
        copy_type: "CONSIGNOR",
        label: "Consignor Copy",
        color_hex: "#FFFFFF",
        color_name: "White",
        sort_order: 1
    },
    {
        copy_type: "CONSIGNEE",
        label: "Consignee Copy",
        color_hex: "#F8C8DC",
        color_name: "Pink",
        sort_order: 2
    },
    {
        copy_type: "DRIVER",
        label: "Driver Copy",
        color_hex: "#FFF59D",
        color_name: "Yellow",
        sort_order: 3
    },
    {
        copy_type: "TRANSPORT",
        label: "Transport Copy",
        color_hex: "#C8E6C9",
        color_name: "Green",
        sort_order: 4
    }
]);

const COLUMNS = `id, company_id, copy_type, label, color_hex, color_name,
                 sort_order, status, created_at, updated_at`;

const listByCompany = async (companyId, executor = db) => {
    const [rows] = await executor.execute(
        `SELECT ${COLUMNS}
         FROM bilty_copy_settings
         WHERE company_id = ? AND status = 1
         ORDER BY sort_order ASC, id ASC`,
        [companyId]
    );
    return rows;
};

const ensureDefaults = async (companyId, executor = db) => {
    const existing = await listByCompany(companyId, executor);
    if (existing.length) {
        return existing;
    }

    for (const row of DEFAULT_COPIES) {
        await executor.execute(
            `INSERT INTO bilty_copy_settings
             (company_id, copy_type, label, color_hex, color_name, sort_order, status)
             VALUES (?, ?, ?, ?, ?, ?, 1)
             ON DUPLICATE KEY UPDATE
               label = VALUES(label),
               color_hex = VALUES(color_hex),
               color_name = VALUES(color_name),
               sort_order = VALUES(sort_order),
               status = 1`,
            [
                companyId,
                row.copy_type,
                row.label,
                row.color_hex,
                row.color_name,
                row.sort_order
            ]
        );
    }

    return listByCompany(companyId, executor);
};

const upsertSettings = async (companyId, rows, executor = db) => {
    for (const row of rows) {
        await executor.execute(
            `INSERT INTO bilty_copy_settings
             (company_id, copy_type, label, color_hex, color_name, sort_order, status)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               label = VALUES(label),
               color_hex = VALUES(color_hex),
               color_name = VALUES(color_name),
               sort_order = VALUES(sort_order),
               status = VALUES(status)`,
            [
                companyId,
                row.copy_type,
                row.label,
                row.color_hex,
                row.color_name || null,
                row.sort_order ?? 0,
                row.status ?? 1
            ]
        );
    }
    return ensureDefaults(companyId, executor);
};

module.exports = {
    DEFAULT_COPIES,
    listByCompany,
    ensureDefaults,
    upsertSettings
};
