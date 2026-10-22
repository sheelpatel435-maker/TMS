const db = require("../config/db");
const { paginatedSelect } = require("../utils/pagination");

const getUserAccess = async (userId, pagination) => {
    return paginatedSelect(db, {
        table: "user_module_access",
        columns: `id, user_id, module_id, can_view, can_create, can_update, can_delete,
                  can_approve, can_export, can_dispatch, can_close, created_at, updated_at`,
        where: "user_id = ?",
        params: [userId],
        orderBy: "module_id ASC",
        pagination
    });
};

const createUserAccess = async (data) => {
    const flags = [
        data.can_view,
        data.can_create,
        data.can_update,
        data.can_delete,
        data.can_approve,
        data.can_export,
        data.can_dispatch,
        data.can_close
    ].map((value) => (value ? 1 : 0));

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
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            can_view = VALUES(can_view),
            can_create = VALUES(can_create),
            can_update = VALUES(can_update),
            can_delete = VALUES(can_delete),
            can_approve = VALUES(can_approve),
            can_export = VALUES(can_export),
            can_dispatch = VALUES(can_dispatch),
            can_close = VALUES(can_close)`,
        [
            data.user_id,
            data.module_id,
            ...flags
        ]
    );

    if (result.insertId) {
        return result.insertId;
    }

    const [rows] = await db.execute(
        `SELECT id
         FROM user_module_access
         WHERE user_id = ? AND module_id = ?
         LIMIT 1`,
        [data.user_id, data.module_id]
    );

    return rows[0]?.id;
};

module.exports = {
    getUserAccess,
    createUserAccess
};
