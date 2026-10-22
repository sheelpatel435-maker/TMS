const db = require("../config/db");

const revoke = async ({ jti, userId, expiresAt }) => {
    await db.execute(
        `INSERT INTO revoked_tokens (jti, user_id, expires_at)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE expires_at = VALUES(expires_at)`,
        [jti, userId, expiresAt]
    );
};

const isRevoked = async (jti) => {
    if (!jti) {
        return false;
    }

    const [rows] = await db.execute(
        `SELECT id
         FROM revoked_tokens
         WHERE jti = ?
         AND expires_at > UTC_TIMESTAMP()
         LIMIT 1`,
        [jti]
    );

    return rows.length > 0;
};

module.exports = {
    revoke,
    isRevoked
};
