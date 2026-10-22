// Dead legacy route — not mounted in server.js. Use moduleRoutes.js.
const express = require("express");
const jwt = require("jsonwebtoken");
const db = require("../db");

const router = express.Router();

const allowedTables = {
    vehicles: "vehicles",
    drivers: "drivers",
    helpers: "helpers",
    clients: "clients",
    bilties: "bilties",
    trips: "trips",
    invoices: "invoices"
};

async function authenticateToken(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: "Token required"
            });
        }

        const parts = authHeader.split(" ");

        if (parts.length !== 2 || parts[0] !== "Bearer") {
            return res.status(401).json({
                success: false,
                message: "Invalid authorization format"
            });
        }

        const decoded = jwt.verify(
            parts[1],
            process.env.JWT_SECRET
        );

        const [rows] = await db.execute(
            `SELECT
                id,
                company_id,
                user_type,
                name,
                mobile,
                email,
                status
             FROM users
             WHERE id = ?
             LIMIT 1`,
            [decoded.user_id]
        );

        if (rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: "User not found"
            });
        }

        if (rows[0].status !== 1) {
            return res.status(403).json({
                success: false,
                message: "User account is inactive"
            });
        }

        req.user = rows[0];

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token"
        });
    }
}

router.get(
    "/:module",
    authenticateToken,
    async (req, res) => {
        try {
            const moduleName =
                req.params.module.toLowerCase();

            const table =
                allowedTables[moduleName];

            if (!table) {
                return res.status(404).json({
                    success: false,
                    message: "Module not found"
                });
            }

            let query =
                `SELECT * FROM ${table}`;

            let values = [];

            if (req.user.user_type !== "SUPER_ADMIN") {
                if (!req.user.company_id) {
                    return res.status(200).json({
                        success: true,
                        module: moduleName,
                        records: []
                    });
                }

                query +=
                    ` WHERE company_id = ?`;

                values.push(
                    req.user.company_id
                );
            }

            query += ` ORDER BY id DESC`;

            const [rows] =
                await db.execute(
                    query,
                    values
                );

            return res.status(200).json({
                success: true,
                module: moduleName,
                records: rows
            });
        } catch (error) {
            console.error(
                "MODULE GET ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message: "Server error"
            });
        }
    }
);

router.get(
    "/:module/:id",
    authenticateToken,
    async (req, res) => {
        try {
            const moduleName =
                req.params.module.toLowerCase();

            const table =
                allowedTables[moduleName];

            const id =
                Number(req.params.id);

            if (!table) {
                return res.status(404).json({
                    success: false,
                    message: "Module not found"
                });
            }

            if (!Number.isInteger(id)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid ID"
                });
            }

            let query =
                `SELECT * FROM ${table}
                 WHERE id = ?`;

            let values = [id];

            if (req.user.user_type !== "SUPER_ADMIN") {
                if (!req.user.company_id) {
                    return res.status(404).json({
                        success: false,
                        message: "Record not found"
                    });
                }

                query +=
                    ` AND company_id = ?`;

                values.push(
                    req.user.company_id
                );
            }

            query += ` LIMIT 1`;

            const [rows] =
                await db.execute(
                    query,
                    values
                );

            if (rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Record not found"
                });
            }

            return res.status(200).json({
                success: true,
                module: moduleName,
                record: rows[0]
            });
        } catch (error) {
            console.error(
                "MODULE DETAIL ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message: "Server error"
            });
        }
    }
);

module.exports = router;