// Dead legacy route — not mounted in server.js.
const express = require("express");
const jwt = require("jsonwebtoken");
const db = require("../db");
require("dotenv").config();

const router = express.Router();

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
        console.error("AUTH ERROR:", error);

        return res.status(401).json({
            success: false,
            message: "Invalid or expired token"
        });
    }
}

router.get(
    "/",
    async (req, res) => {
        try {
            const [rows] = await db.execute(
                `SELECT
                    id,
                    name,
                    status
                 FROM companies
                 WHERE status = 1
                 ORDER BY name ASC`
            );

            return res.status(200).json({
                success: true,
                companies: rows
            });
        } catch (error) {
            console.error("GET COMPANIES ERROR:", error);

            return res.status(500).json({
                success: false,
                message: "Server error"
            });
        }
    }
);

router.get(
    "/:id",
    authenticateToken,
    async (req, res) => {
        try {
            const companyId = Number(req.params.id);

            if (!Number.isInteger(companyId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid company ID"
                });
            }

            if (
                req.user.user_type !== "SUPER_ADMIN" &&
                Number(req.user.company_id) !== companyId
            ) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied"
                });
            }

            const [rows] = await db.execute(
                `SELECT
                    id,
                    name,
                    status,
                    created_at,
                    updated_at
                 FROM companies
                 WHERE id = ?
                 LIMIT 1`,
                [companyId]
            );

            if (rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Company not found"
                });
            }

            return res.status(200).json({
                success: true,
                company: rows[0]
            });
        } catch (error) {
            console.error("GET COMPANY ERROR:", error);

            return res.status(500).json({
                success: false,
                message: "Server error"
            });
        }
    }
);

router.post(
    "/",
    authenticateToken,
    async (req, res) => {
        try {
            const name = req.body.name
                ? req.body.name.trim()
                : "";

            if (!name) {
                return res.status(400).json({
                    success: false,
                    message: "Company name is required"
                });
            }

            if (
                req.user.user_type !== "SUPER_ADMIN" &&
                req.user.company_id
            ) {
                return res.status(403).json({
                    success: false,
                    message: "You are already assigned to a company"
                });
            }

            const [existingRows] = await db.execute(
                `SELECT id
                 FROM companies
                 WHERE name = ?
                 LIMIT 1`,
                [name]
            );

            if (existingRows.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: "Company already exists"
                });
            }

            const [result] = await db.execute(
                `INSERT INTO companies
                (
                    name,
                    status
                )
                VALUES (?, ?)`,
                [
                    name,
                    1
                ]
            );

            const companyId = result.insertId;

            if (
                req.user.user_type !== "SUPER_ADMIN"
            ) {
                await db.execute(
                    `UPDATE users
                     SET
                        company_id = ?,
                        user_type = 'COMPANY_ADMIN'
                     WHERE id = ?`,
                    [
                        companyId,
                        req.user.id
                    ]
                );
            }

            const [companyRows] = await db.execute(
                `SELECT
                    id,
                    name,
                    status,
                    created_at,
                    updated_at
                 FROM companies
                 WHERE id = ?
                 LIMIT 1`,
                [companyId]
            );

            const [userRows] = await db.execute(
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
                [req.user.id]
            );

            const token = jwt.sign(
                {
                    user_id: userRows[0].id,
                    company_id: userRows[0].company_id,
                    user_type: userRows[0].user_type
                },
                process.env.JWT_SECRET,
                {
                    expiresIn: "1d"
                }
            );

            return res.status(201).json({
                success: true,
                message: "Company created successfully",
                company: companyRows[0],
                user: userRows[0],
                token: token
            });
        } catch (error) {
            console.error("CREATE COMPANY ERROR:", error);

            return res.status(500).json({
                success: false,
                message: "Server error"
            });
        }
    }
);

router.put(
    "/:id",
    authenticateToken,
    async (req, res) => {
        try {
            const companyId = Number(req.params.id);

            const name = req.body.name
                ? req.body.name.trim()
                : "";

            const status =
                Number(req.body.status) === 0
                    ? 0
                    : 1;

            if (!Number.isInteger(companyId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid company ID"
                });
            }

            if (!name) {
                return res.status(400).json({
                    success: false,
                    message: "Company name is required"
                });
            }

            if (
                req.user.user_type !== "SUPER_ADMIN" &&
                Number(req.user.company_id) !== companyId
            ) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied"
                });
            }

            const [existingRows] = await db.execute(
                `SELECT id
                 FROM companies
                 WHERE name = ?
                 AND id <> ?
                 LIMIT 1`,
                [
                    name,
                    companyId
                ]
            );

            if (existingRows.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: "Company name already exists"
                });
            }

            const [result] = await db.execute(
                `UPDATE companies
                 SET
                    name = ?,
                    status = ?
                 WHERE id = ?`,
                [
                    name,
                    status,
                    companyId
                ]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Company not found"
                });
            }

            const [rows] = await db.execute(
                `SELECT
                    id,
                    name,
                    status,
                    created_at,
                    updated_at
                 FROM companies
                 WHERE id = ?
                 LIMIT 1`,
                [companyId]
            );

            return res.status(200).json({
                success: true,
                message: "Company updated successfully",
                company: rows[0]
            });
        } catch (error) {
            console.error("UPDATE COMPANY ERROR:", error);

            return res.status(500).json({
                success: false,
                message: "Server error"
            });
        }
    }
);

router.delete(
    "/:id",
    authenticateToken,
    async (req, res) => {
        try {
            const companyId = Number(req.params.id);

            if (!Number.isInteger(companyId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid company ID"
                });
            }

            if (
                req.user.user_type !== "SUPER_ADMIN" &&
                Number(req.user.company_id) !== companyId
            ) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied"
                });
            }

            const [result] = await db.execute(
                `UPDATE companies
                 SET status = 0
                 WHERE id = ?`,
                [companyId]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Company not found"
                });
            }

            return res.status(200).json({
                success: true,
                message: "Company deactivated successfully"
            });
        } catch (error) {
            console.error("DEACTIVATE COMPANY ERROR:", error);

            return res.status(500).json({
                success: false,
                message: "Server error"
            });
        }
    }
);

module.exports = router;