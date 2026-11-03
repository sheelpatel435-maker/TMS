const db = require("../config/db");

const accessLog = (req, res, next) => {
    if (!req.originalUrl.startsWith("/api")) {
        return next();
    }

    res.on("finish", () => {
        const user = req.user;

        db.execute(
            `INSERT INTO access_logs
            (company_id, user_id, session_id, method, endpoint, ip_address, user_agent, response_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                user?.company_id || null,
                user?.id || null,
                user?.jti || null,
                String(req.method || "").slice(0, 10),
                String(req.originalUrl || "").slice(0, 255),
                req.ip || null,
                String(req.headers["user-agent"] || "").slice(0, 500) || null,
                res.statusCode || null
            ]
        ).catch((error) => {
            console.error("ACCESS LOG ERROR:", error.message);
        });
    });

    next();
};

module.exports = accessLog;
