
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

const findDuplicateContact = async (mobile, email, excludeUserId = null) => {
    const [rows] = await db.execute(
        `SELECT id
         FROM users
         WHERE (
             REGEXP_REPLACE(
                 REGEXP_REPLACE(TRIM(mobile), '[[:space:]-]', ''),
                 '^[+]91',
                 ''
             ) = ?
             OR (? IS NOT NULL AND LOWER(TRIM(email)) = LOWER(?))
         )
         AND (? IS NULL OR id <> ?)
         LIMIT 1`,
        [mobile, email, email, excludeUserId, excludeUserId]
    );

    return rows[0] || null;
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
        VALUES (?, 'COMPANY_USER', ?, ?, ?, ?, CURRENT_TIMESTAMP, 1)`,
        [
            data.company_id,
            data.name,
            data.mobile,
            data.email || null,
            data.password_hash
        ]
    );

    return result.insertId;
};

const updateUser = async (id, data) => {
    const fields = [];
    const params = [];

    for (const field of ["name", "mobile", "email"]) {
        if (data[field] !== undefined) {
            fields.push(`${field} = ?`);
            params.push(data[field]);
        }
    }

    if (data.password_hash) {
        fields.push("password_hash = ?", "password_changed_at = CURRENT_TIMESTAMP");
        params.push(data.password_hash);
    }

    if (fields.length === 0) {
        return 0;
    }

    params.push(id);

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        if (data.password_hash) {
            fields.push("token_version = token_version + 1");
        }

        const [result] = await connection.execute(
            `UPDATE users
             SET ${fields.join(", ")}
             WHERE id = ?`,
            params
        );

        if (data.password_hash && result.affectedRows > 0) {
            await connection.execute(
                `UPDATE refresh_tokens
                 SET revoked_at = UTC_TIMESTAMP()
                 WHERE user_id = ?
                 AND revoked_at IS NULL`,
                [id]
            );
        }

        await connection.commit();
        return result.affectedRows;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const setUserStatus = async (userId, status) => {
    if (status !== 0 && status !== 1) {
        throw new Error("User status must be 0 or 1");
    }

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const [result] = await connection.execute(
            `UPDATE users
             SET status = ?,
                 token_version = CASE
                     WHEN ? = 0 THEN token_version + 1
                     ELSE token_version
                 END
             WHERE id = ?
             AND status <> ?`,
            [status, status, userId, status]
        );

        if (status === 0 && result.affectedRows > 0) {
            await connection.execute(
                `UPDATE refresh_tokens
                 SET revoked_at = UTC_TIMESTAMP()
                 WHERE user_id = ?
                 AND revoked_at IS NULL`,
                [userId]
            );
        }

        await connection.commit();
        return result.affectedRows;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

module.exports = {
    findUserByEmail,
    findUserByMobile,
    findDuplicateContact,
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
    setUserStatus
};