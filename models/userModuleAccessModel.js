const db = require("../config/db");

const getUserAccess = async (userId) => {
    const [rows] = await db.execute(
        `SELECT
            id,
            user_id,
            module_id,
            can_view,
            can_create,
            can_update,
            can_delete,
            can_approve,
            can_export,
            can_dispatch,
            can_close,
            created_at,
            updated_at
         FROM user_module_access
         WHERE user_id = ?
         ORDER BY module_id ASC`,
        [userId]
    );

    return rows;
};

const createUserAccess = async (data) => {
    const [result] = await db.execute(
        `INSERT INTO user_module_access
        (
            user_id,
            module_id,
            can_view,
            can_create,
            can_update,
            can_delete,
            can_approve,
            can_export,
            can_dispatch,
            can_close
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            data.user_id,
            data.module_id,
            data.can_view || 0,
            data.can_create || 0,
            data.can_update || 0,
            data.can_delete || 0,
            data.can_approve || 0,
            data.can_export || 0,
            data.can_dispatch || 0,
            data.can_close || 0
        ]
    );

    return result.insertId;
};

module.exports = {
    getUserAccess,
    createUserAccess
};
