const db = require("../config/db");

const columns = "id, name, status, created_at, updated_at";

const listActive = async () => {
    const [rows] = await db.execute(
        `SELECT id, name, status
         FROM companies
         WHERE status = 1
         ORDER BY name ASC`
    );

    return rows;
};

const listAll = async () => {
    const [rows] = await db.execute(
        `SELECT ${columns}
         FROM companies
         ORDER BY id DESC`
    );

    return rows;
};

const getById = async (id) => {
    const [rows] = await db.execute(
        `SELECT ${columns}
         FROM companies
         WHERE id = ?
         LIMIT 1`,
        [id]
    );

    return rows[0] || null;
};

const findByName = async (name) => {
    const [rows] = await db.execute(
        `SELECT id
         FROM companies
         WHERE name = ?
         LIMIT 1`,
        [name]
    );

    return rows[0] || null;
};

const createCompany = async (name) => {
    const [result] = await db.execute(
        `INSERT INTO companies (name, status)
         VALUES (?, 1)`,
        [name]
    );

    return result.insertId;
};

const updateCompany = async (id, data) => {
    const [result] = await db.execute(
        `UPDATE companies
         SET name = ?,
             status = ?
         WHERE id = ?`,
        [data.name, data.status, id]
    );

    return result.affectedRows;
};

const deactivateCompany = async (id) => {
    const [result] = await db.execute(
        `UPDATE companies
         SET status = 0
         WHERE id = ?
         AND status = 1`,
        [id]
    );

    return result.affectedRows;
};

module.exports = {
    listActive,
    listAll,
    getById,
    findByName,
    createCompany,
    updateCompany,
    deactivateCompany
};
