const crypto = require("crypto");
const db = require("../config/db");

const hashToken = (token) =>
    crypto.createHash("sha256").update(token).digest("hex");

const create = async (userId, token, expiresAt) => {
    await db.execute(
        `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
         VALUES (?, ?, ?)`,
        [userId, hashToken(token), expiresAt]
    );
};

const findByToken = async (token) => {
    const [rows] = await db.execute(
        `SELECT *
         FROM refresh_tokens
         WHERE token_hash = ?
         LIMIT 1`,
        [hashToken(token)]
    );

    return rows[0] || null;
};

const revokeByToken = async (token) => {
    const [result] = await db.execute(
        `UPDATE refresh_tokens
         SET revoked_at = UTC_TIMESTAMP()
         WHERE token_hash = ?
         AND revoked_at IS NULL`,
        [hashToken(token)]
    );

    return result.affectedRows;
};

const revokeAllForUser = async (userId) => {
    await db.execute(
        `UPDATE refresh_tokens
         SET revoked_at = UTC_TIMESTAMP()
         WHERE user_id = ?
         AND revoked_at IS NULL`,
        [userId]
    );
};

module.exports = {
    hashToken,
    create,
    findByToken,
    revokeByToken,
    revokeAllForUser
};
