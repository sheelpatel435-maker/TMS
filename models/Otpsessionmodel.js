

const db = require("../config/db");

const seconds = (value) => Math.max(1, Math.floor(Number(value) || 0));

const create = async ({ userId, purpose, otpHash, ttlSeconds, ip }) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        await connection.execute(
            `UPDATE user_otp_sessions
             SET consumed_at = UTC_TIMESTAMP()
             WHERE user_id = ?
               AND purpose = ?
               AND consumed_at IS NULL`,
            [userId, purpose]
        );

        const [result] = await connection.execute(
            `INSERT INTO user_otp_sessions
                (user_id, purpose, otp_hash, expires_at, ip_address)
             VALUES (?, ?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ${seconds(ttlSeconds)} SECOND), ?)`,
            [userId, purpose, otpHash, ip || null]
        );

        await connection.commit();

        return result.insertId;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const findActive = async (userId, purpose) => {
    const [rows] = await db.execute(
        `SELECT id, otp_hash, attempts
         FROM user_otp_sessions
         WHERE user_id = ?
           AND purpose = ?
           AND consumed_at IS NULL
           AND expires_at > UTC_TIMESTAMP()
         ORDER BY id DESC
         LIMIT 1`,
        [userId, purpose]
    );

    return rows[0] || null;
};

const incrementAttempts = async (id) => {
    await db.execute(
        `UPDATE user_otp_sessions
         SET attempts = attempts + 1
         WHERE id = ?`,
        [id]
    );
};

// Atomic one-time use: sirf ek request OTP consume kar payegi.
const consume = async (id) => {
    const [result] = await db.execute(
        `UPDATE user_otp_sessions
         SET consumed_at = UTC_TIMESTAMP()
         WHERE id = ?
           AND consumed_at IS NULL
           AND expires_at > UTC_TIMESTAMP()`,
        [id]
    );

    return result.affectedRows;
};


const countRecent = async (userId, purpose, windowSeconds) => {
    const [rows] = await db.execute(
        `SELECT COUNT(*) AS total
         FROM user_otp_sessions
         WHERE user_id = ?
           AND purpose = ?
           AND created_at > DATE_SUB(CURRENT_TIMESTAMP, INTERVAL ${seconds(windowSeconds)} SECOND)`,
        [userId, purpose]
    );

    return Number(rows[0].total);
};

module.exports = {
    create,
    findActive,
    incrementAttempts,
    consume,
    countRecent
};