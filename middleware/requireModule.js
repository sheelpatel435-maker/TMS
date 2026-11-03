const db = require("../config/db");
const { isAdmin } = require("../utils/roles");

const MODULE_ALIASES = {
    Drivers: "Drivers & Helpers",
    Helpers: "Drivers & Helpers",
    Bilties: "Bilty",
    Documents: "Vehicles",
    "Vehicle Types": "Vehicles",
    "Vehicle Assignments": "Vehicles"
};

const requireModule = (moduleName, flag = "can_view") => {
    const allowedFlags = [
        "can_view",
        "can_create",
        "can_update",
        "can_delete",
        "can_approve",
        "can_dispatch",
        "can_export",
        "can_close"
    ];

    return async (req, res, next) => {
        try {
            if (isAdmin(req.user)) {
                return next();
            }

            const resolvedFlag = typeof flag === "function" ? flag(req) : flag;

            if (!allowedFlags.includes(resolvedFlag)) {
                return res.status(500).json({
                    success: false,
                    message: "Server error"
                });
            }

            const resolvedName = MODULE_ALIASES[moduleName] || moduleName;

            const [rows] = await db.execute(
                `SELECT uma.${resolvedFlag} AS allowed
                 FROM user_module_access uma
                 INNER JOIN module_definitions md
                    ON md.id = uma.module_id
                 WHERE uma.user_id = ?
                 AND LOWER(md.name) = LOWER(?)
                 LIMIT 1`,
                [req.user.id, resolvedName]
            );

            if (!rows[0] || Number(rows[0].allowed) !== 1) {
                return res.status(403).json({
                    success: false,
                    message: `You do not have ${resolvedFlag.replace("can_", "")} access for ${moduleName}`
                });
            }

            next();
        } catch (error) {
            console.error(error);

            return res.status(500).json({
                success: false,
                message: "Server error"
            });
        }
    };
};

module.exports = requireModule;
