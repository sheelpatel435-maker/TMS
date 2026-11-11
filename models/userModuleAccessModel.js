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

const ACCESS_COLUMNS = `id, user_id, module_id, can_view, can_create, can_update,
                        can_delete, can_approve, can_export, can_dispatch, can_close,
                        created_at, updated_at`;

const getAllUserAccess = async (userId, connection = db) => {
    const [rows] = await connection.execute(
        `SELECT ${ACCESS_COLUMNS}
         FROM user_module_access
         WHERE user_id = ?
         ORDER BY module_id ASC`,
        [userId]
    );

    return rows;
};

const replaceUserAccess = async (userId, modules) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();
        const oldAccess = await getAllUserAccess(userId, connection);

        await connection.execute(
            `DELETE FROM user_module_access
             WHERE user_id = ?`,
            [userId]
        );

        for (const module of modules) {
            const enabled = new Set(module.actions);
            const flags = [
                "can_view",
                "can_create",
                "can_update",
                "can_delete",
                "can_approve",
                "can_export",
                "can_dispatch",
                "can_close"
            ].map((action) => (enabled.has(action) ? 1 : 0));

            await connection.execute(
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
                [userId, module.module_id, ...flags]
            );
        }

        const newAccess = await getAllUserAccess(userId, connection);
        await connection.commit();
        return { oldAccess, newAccess };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

module.exports = {
    getUserAccess,
    getAllUserAccess,
    replaceUserAccess
};
