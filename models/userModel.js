const db = require("../config/db");

const findUserByEmail = async (email) => {
    const [rows] = await db.execute(
        `SELECT id, company_id, user_type, name, mobile, email, password_hash, status
         FROM users
         WHERE email = ?
         LIMIT 1`,
        [email]
    );

    return rows[0];
};

const findUserById = async (id) => {
    const [rows] = await db.execute(
        `SELECT id, company_id, user_type, name, mobile, email, status
         FROM users
         WHERE id = ?
         LIMIT 1`,
        [id]
    );

    return rows[0];
};

const updateLastLogin = async (id) => {
    await db.execute(
        `UPDATE users
         SET password_changed_at = password_changed_at
         WHERE id = ?`,
        [id]
    );
};

module.exports = {
    findUserByEmail,
    findUserById,
    updateLastLogin
};
