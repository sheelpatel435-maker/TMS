
const db = require("../config/db");
const { paginatedSelect } = require("../utils/pagination");
const { toTinyIntStatus } = require("../utils/validation");

const USER_COLUMNS = `id, company_id, user_type, name, mobile, email, status,
                token_version, last_login_at, created_at, updated_at`;


const AUTH_SELECT = `SELECT u.id, u.company_id, u.user_type, u.name, u.mobile, u.email,
                u.password_hash, u.status, u.token_version, u.last_login_at,
                u.mobile_verified_at, c.status AS company_status
         FROM users u
         LEFT JOIN companies c ON c.id = u.company_id`;

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


const findUserByMobile = async (mobile) => {
    const [rows] = await db.execute(
        `SELECT id, company_id, user_type, name, mobile, email, password_hash,
                status, token_version, last_login_at
         FROM users
         WHERE mobile = ?
         LIMIT 1`,
        [mobile]
    );

    return rows[0];
};

const findAuthByEmail = async (email) => {
    const [rows] = await db.execute(
        `${AUTH_SELECT}
         WHERE u.email = ?
         LIMIT 1`,
        [email]
    );

    return rows[0] || null;
};

const findAuthByMobile = async (mobile) => {
    const [rows] = await db.execute(
        `${AUTH_SELECT}
         WHERE u.mobile = ?
         LIMIT 1`,
        [mobile]
    );

    return rows[0] || null;
};

const findAuthById = async (id) => {
    const [rows] = await db.execute(
        `${AUTH_SELECT}
         WHERE u.id = ?
         LIMIT 1`,
        [id]
    );

    return rows[0] || null;
};

const findUserById = async (id) => {
    const [rows] = await db.execute(
        `SELECT ${USER_COLUMNS}
         FROM users
         WHERE id = ?
         LIMIT 1`,
        [id]
    );

    return rows[0];
};

const getUsers = async (companyId, pagination, filters = {}) => {
    const where = [];
    const params = [];

    if (companyId) {
        where.push("company_id = ?");
        params.push(companyId);
    }

    if (filters.status !== undefined && filters.status !== "") {
        where.push("status = ?");
        params.push(toTinyIntStatus(filters.status, 1));
    }

    if (filters.user_type) {
        where.push("user_type = ?");
        params.push(filters.user_type);
    }

    if (filters.search) {
        where.push("(name LIKE ? OR mobile LIKE ? OR email LIKE ?)");
        const term = `%${filters.search}%`;
        params.push(term, term, term);
    }

    return paginatedSelect(db, {
        table: "users",
        columns: USER_COLUMNS,
        where: where.join(" AND "),
        params,
        orderBy: "id DESC",
        pagination
    });
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


const updatePassword = async (id, passwordHash) => {
    const [result] = await db.execute(
        `UPDATE users
         SET password_hash = ?,
             password_changed_at = CURRENT_TIMESTAMP,
             token_version = token_version + 1
         WHERE id = ?`,
        [passwordHash, id]
    );

    return result.affectedRows;
};

const markMobileVerified = async (id) => {
    await db.execute(
        `UPDATE users
         SET mobile_verified_at = COALESCE(mobile_verified_at, CURRENT_TIMESTAMP)
         WHERE id = ?`,
        [id]
    );
};

const createUser = async (data) => {
    const [result] = await db.execute(
        `INSERT INTO users
        (company_id, user_type, name, mobile, email, password_hash,
         password_changed_at, status)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)`,
        [
            data.company_id || null,
            data.user_type,
            data.name,
            data.mobile,
            data.email || null,
            data.password_hash,
            toTinyIntStatus(data.status, 1)
        ]
    );

    return result.insertId;
};


const updateUser = async (id, data, scopeCompanyId = null) => {
    const fields = [
        "company_id = ?",
        "user_type = ?",
        "name = ?",
        "mobile = ?",
        "email = ?",
        "status = ?"
    ];
    const params = [
        data.company_id || null,
        data.user_type,
        data.name,
        data.mobile,
        data.email || null,
        toTinyIntStatus(data.status, 1)
    ];

    if (data.password_hash) {
        fields.push("password_hash = ?", "password_changed_at = CURRENT_TIMESTAMP");
        params.push(data.password_hash);
    }

    let where = "id = ?";
    params.push(id);

    if (scopeCompanyId) {
        where += " AND company_id = ?";
        params.push(scopeCompanyId);
    }

    const [result] = await db.execute(
        `UPDATE users
         SET ${fields.join(", ")}
         WHERE ${where}`,
        params
    );

    return result.affectedRows;
};

const deactivateUser = async (id, scopeCompanyId = null) => {
    const params = [id];
    let scope = "";

    if (scopeCompanyId) {
        scope = "AND company_id = ?";
        params.push(scopeCompanyId);
    }

    const [result] = await db.execute(
        `UPDATE users
         SET status = 0,
             token_version = token_version + 1
         WHERE id = ?
         AND status = 1
         ${scope}`,
        params
    );

    return result.affectedRows;
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
    findUserByMobile,
    findAuthByEmail,
    findAuthByMobile,
    findAuthById,
    findUserById,
    getUsers,
    updateLastLogin,
    bumpTokenVersion,
    updatePassword,
    markMobileVerified,
    createUser,
    updateUser,
    deactivateUser,
    assignCompanyAdmin
};