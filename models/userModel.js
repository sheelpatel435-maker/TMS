const db = require("../config/db");

const findUserByEmail = async (email) => {
    const [rows] = await db.execute(
        `SELECT id, company_id, user_type, name, mobile, email, password_hash,
                status, token_version, last_login_at
         FROM users
         WHERE email = ?
         LIMIT 1`,
        [email]
    );

    return rows[0];
};

const findUserById = async (id) => {
    const [rows] = await db.execute(
        `SELECT id, company_id, user_type, name, mobile, email, status,
                token_version, last_login_at
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
         SET last_login_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [id]
    );
};

const bumpTokenVersion = async (id) => {
    await db.execute(
        `UPDATE users
         SET token_version = token_version + 1
         WHERE id = ?`,
        [id]
    );
};

const createUser = async (data) => {
    const [result] = await db.execute(
        `INSERT INTO users
        (company_id, user_type, name, mobile, email, password_hash, status)
        VALUES (?, ?, ?, ?, ?, ?, 1)`,
        [
            data.company_id || null,
            data.user_type,
            data.name,
            data.mobile,
            data.email || null,
            data.password_hash
        ]
    );

    return result.insertId;
};

const assignCompanyAdmin = async (userId, companyId) => {
    await db.execute(
        `UPDATE users
         SET company_id = ?,
             user_type = 'COMPANY_ADMIN'
         WHERE id = ?`,
        [companyId, userId]
    );
};

module.exports = {
    findUserByEmail,
    findUserById,
    updateLastLogin,
    bumpTokenVersion,
    createUser,
    assignCompanyAdmin
};
