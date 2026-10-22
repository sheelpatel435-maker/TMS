// Dead legacy route — not mounted in server.js. Use biltyRoutes.js.
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

router.get("/", authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.company_id;

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: "User is not assigned to a company"
            });
        }

        const [rows] = await db.execute(
            `SELECT
                id,
                company_id,
                bilty_number,
                client_id,
                status,
                trip_id,
                created_at,
                updated_at
             FROM bilties
             WHERE company_id = ?
             ORDER BY id DESC`,
            [companyId]
        );

        return res.status(200).json({
            success: true,
            bilties: rows
        });

    } catch (error) {
        console.error("GET BILTIES ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
});

router.post("/", authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.company_id;

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: "User is not assigned to a company"
            });
        }

        const {
            bilty_number,
            client_id,
            trip_id,
            status
        } = req.body;

        if (!bilty_number) {
            return res.status(400).json({
                success: false,
                message: "Bilty number is required"
            });
        }

        const allowedStatuses = [
            "RESERVED",
            "CREATED",
            "CANCELLED",
            "COMPLETED"
        ];

        const biltyStatus =
            status || "RESERVED";

        if (!allowedStatuses.includes(biltyStatus)) {
            return res.status(400).json({
                success: false,
                message: "Invalid bilty status"
            });
        }

        const [existing] = await db.execute(
            `SELECT id
             FROM bilties
             WHERE company_id = ?
             AND bilty_number = ?
             LIMIT 1`,
            [
                companyId,
                bilty_number
            ]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Bilty number already exists"
            });
        }

        if (client_id) {
            const [clientRows] = await db.execute(
                `SELECT id
                 FROM clients
                 WHERE id = ?
                 AND company_id = ?
                 LIMIT 1`,
                [
                    client_id,
                    companyId
                ]
            );

            if (clientRows.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "Client not found"
                });
            }
        }

        if (trip_id) {
            const [tripRows] = await db.execute(
                `SELECT id
                 FROM trips
                 WHERE id = ?
                 AND company_id = ?
                 LIMIT 1`,
                [
                    trip_id,
                    companyId
                ]
            );

            if (tripRows.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "Trip not found"
                });
            }
        }

        const [result] = await db.execute(
            `INSERT INTO bilties
            (
                company_id,
                bilty_number,
                client_id,
                status,
                trip_id
            )
            VALUES (?, ?, ?, ?, ?)`,
            [
                companyId,
                bilty_number,
                client_id || null,
                biltyStatus,
                trip_id || null
            ]
        );

        return res.status(201).json({
            success: true,
            message: "Bilty created successfully",
            bilty_id: result.insertId
        });

    } catch (error) {
        console.error("CREATE BILTY ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
});

router.put("/:id", authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const biltyId = Number(req.params.id);

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: "User is not assigned to a company"
            });
        }

        if (!Number.isInteger(biltyId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid bilty ID"
            });
        }

        const {
            bilty_number,
            client_id,
            trip_id,
            status
        } = req.body;

        if (!bilty_number) {
            return res.status(400).json({
                success: false,
                message: "Bilty number is required"
            });
        }

        const allowedStatuses = [
            "RESERVED",
            "CREATED",
            "CANCELLED",
            "COMPLETED"
        ];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid bilty status"
            });
        }

        const [result] = await db.execute(
            `UPDATE bilties
             SET
                bilty_number = ?,
                client_id = ?,
                status = ?,
                trip_id = ?
             WHERE id = ?
             AND company_id = ?`,
            [
                bilty_number,
                client_id || null,
                status,
                trip_id || null,
                biltyId,
                companyId
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Bilty not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Bilty updated successfully"
        });

    } catch (error) {
        console.error("UPDATE BILTY ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
});

router.delete("/:id", authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const biltyId = Number(req.params.id);

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: "User is not assigned to a company"
            });
        }

        if (!Number.isInteger(biltyId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid bilty ID"
            });
        }

        const [result] = await db.execute(
            `UPDATE bilties
             SET status = 'CANCELLED'
             WHERE id = ?
             AND company_id = ?`,
            [
                biltyId,
                companyId
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Bilty not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Bilty cancelled successfully"
        });

    } catch (error) {
        console.error("DELETE BILTY ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
});

module.exports = router;