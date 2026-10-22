// Dead legacy route — not mounted in server.js. Use driverRoutes.js.
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
                name,
                mobile,
                email,
                address,
                status,
                created_at,
                updated_at
             FROM drivers
             WHERE company_id = ?
             ORDER BY id DESC`,
            [companyId]
        );

        return res.status(200).json({
            success: true,
            drivers: rows
        });

    } catch (error) {
        console.error("GET DRIVERS ERROR:", error);

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
            name,
            mobile,
            email,
            address,
            status
        } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Driver name is required"
            });
        }

        if (!mobile) {
            return res.status(400).json({
                success: false,
                message: "Mobile number is required"
            });
        }

        const [existing] = await db.execute(
            `SELECT id
             FROM drivers
             WHERE company_id = ?
             AND mobile = ?
             LIMIT 1`,
            [companyId, mobile]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Driver mobile number already exists"
            });
        }

        const [result] = await db.execute(
            `INSERT INTO drivers
            (
                company_id,
                name,
                mobile,
                email,
                address,
                status
            )
            VALUES (?, ?, ?, ?, ?, ?)`,
            [
                companyId,
                name,
                mobile,
                email || null,
                address || null,
                status ?? 1
            ]
        );

        return res.status(201).json({
            success: true,
            message: "Driver created successfully",
            driver_id: result.insertId
        });

    } catch (error) {
        console.error("CREATE DRIVER ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
});

router.put("/:id", authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const driverId = Number(req.params.id);

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: "User is not assigned to a company"
            });
        }

        if (!Number.isInteger(driverId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid driver ID"
            });
        }

        const {
            name,
            mobile,
            email,
            address,
            status
        } = req.body;

        if (!name || !mobile) {
            return res.status(400).json({
                success: false,
                message: "Name and mobile are required"
            });
        }

        const [result] = await db.execute(
            `UPDATE drivers
             SET
                name = ?,
                mobile = ?,
                email = ?,
                address = ?,
                status = ?
             WHERE id = ?
             AND company_id = ?`,
            [
                name,
                mobile,
                email || null,
                address || null,
                status ?? 1,
                driverId,
                companyId
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Driver not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Driver updated successfully"
        });

    } catch (error) {
        console.error("UPDATE DRIVER ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
});

router.delete("/:id", authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const driverId = Number(req.params.id);

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: "User is not assigned to a company"
            });
        }

        if (!Number.isInteger(driverId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid driver ID"
            });
        }

        const [result] = await db.execute(
            `UPDATE drivers
             SET status = 0
             WHERE id = ?
             AND company_id = ?`,
            [driverId, companyId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Driver not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Driver deactivated successfully"
        });

    } catch (error) {
        console.error("DELETE DRIVER ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
});

module.exports = router;