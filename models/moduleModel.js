const db = require("../config/db");
const { paginatedSelect } = require("../utils/pagination");

const getAllModules = async (pagination) => {
    return paginatedSelect(db, {
        table: "module_definitions",
        columns: `id, name, status, created_at, updated_at`,
        orderBy: "id ASC",
        pagination
    });
};

const getModuleById = async (id) => {
    const [rows] = await db.execute(
        `SELECT id, name, status, created_at, updated_at
         FROM module_definitions
         WHERE id = ?
         LIMIT 1`,
        [id]
    );

    return rows[0];
};

const createModule = async (data) => {
    const [result] = await db.execute(
        `INSERT INTO module_definitions
        (name, status)
        VALUES (?, ?)`,
        [
            data.name,
            data.status ?? 1
        ]
    );

    return result.insertId;
};

const updateModule = async (id, data) => {
    const [result] = await db.execute(
        `UPDATE module_definitions
         SET name = ?,
             status = ?
         WHERE id = ?`,
        [
            data.name,
            data.status ?? 1,
            id
        ]
    );

    return result.affectedRows;
};

module.exports = {
    getAllModules,
    getModuleById,
    createModule,
    updateModule
};
