const db = require("../config/db");
const { paginatedSelect } = require("../utils/pagination");
const { toTinyIntStatus } = require("../utils/validation");

const USER_COLUMNS = `id, company_id, user_type, name, mobile, email, status,
                token_version, last_login_at, created_at, updated_at`;

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

const createUser = async (data) => {
    const [result] = await db.execute(
        `INSERT INTO users
        (company_id, user_type, name, mobile, email, password_hash, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
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

const updateUser = async (id, data) => {
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
        fields.push("password_hash = ?");
        params.push(data.password_hash);
    }

    params.push(id);

    const [result] = await db.execute(
        `UPDATE users
         SET ${fields.join(", ")}
         WHERE id = ?`,
        params
    );

    return result.affectedRows;
};

const deactivateUser = async (id) => {
    const [result] = await db.execute(
        `UPDATE users
         SET status = 0,
             token_version = token_version + 1
         WHERE id = ?
         AND status = 1`,
        [id]
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
    findUserById,
    getUsers,
    updateLastLogin,
    bumpTokenVersion,
    createUser,
    updateUser,
    deactivateUser,
    assignCompanyAdmin
};
