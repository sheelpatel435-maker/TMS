// Dead legacy route — not mounted in server.js. Use vehicleRoutes.js.
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
                vehicle_type_id,
                registration_no,
                capacity,
                status,
                created_at,
                updated_at
             FROM vehicles
             WHERE company_id = ?
             ORDER BY id DESC`,
            [companyId]
        );

        return res.status(200).json({
            success: true,
            vehicles: rows
        });
    } catch (error) {
        console.error("GET VEHICLES ERROR:", error);

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
            vehicle_type_id,
            registration_no,
            capacity,
            status
        } = req.body;

        if (!vehicle_type_id) {
            return res.status(400).json({
                success: false,
                message: "Vehicle type is required"
            });
        }

        if (!registration_no) {
            return res.status(400).json({
                success: false,
                message: "Registration number is required"
            });
        }

        const [existing] = await db.execute(
            `SELECT id
             FROM vehicles
             WHERE company_id = ?
             AND registration_no = ?
             LIMIT 1`,
            [
                companyId,
                registration_no
            ]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Vehicle registration already exists"
            });
        }

        const [result] = await db.execute(
            `INSERT INTO vehicles
            (
                company_id,
                vehicle_type_id,
                registration_no,
                capacity,
                status
            )
            VALUES (?, ?, ?, ?, ?)`,
            [
                companyId,
                vehicle_type_id,
                registration_no,
                capacity || null,
                status ?? 1
            ]
        );

        return res.status(201).json({
            success: true,
            message: "Vehicle created successfully",
            vehicle_id: result.insertId
        });
    } catch (error) {
        console.error("CREATE VEHICLE ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
});

router.put("/:id", authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const vehicleId = Number(req.params.id);

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: "User is not assigned to a company"
            });
        }

        if (!Number.isInteger(vehicleId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid vehicle ID"
            });
        }

        const {
            vehicle_type_id,
            registration_no,
            capacity,
            status
        } = req.body;

        if (!vehicle_type_id || !registration_no) {
            return res.status(400).json({
                success: false,
                message: "Vehicle type and registration number are required"
            });
        }

        const [result] = await db.execute(
            `UPDATE vehicles
             SET
                vehicle_type_id = ?,
                registration_no = ?,
                capacity = ?,
                status = ?
             WHERE id = ?
             AND company_id = ?`,
            [
                vehicle_type_id,
                registration_no,
                capacity || null,
                status ?? 1,
                vehicleId,
                companyId
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Vehicle not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Vehicle updated successfully"
        });
    } catch (error) {
        console.error("UPDATE VEHICLE ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
});

router.delete("/:id", authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const vehicleId = Number(req.params.id);

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: "User is not assigned to a company"
            });
        }

        if (!Number.isInteger(vehicleId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid vehicle ID"
            });
        }

        const [result] = await db.execute(
            `UPDATE vehicles
             SET status = 0
             WHERE id = ?
             AND company_id = ?`,
            [
                vehicleId,
                companyId
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Vehicle not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Vehicle deactivated successfully"
        });
    } catch (error) {
        console.error("DELETE VEHICLE ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
});

module.exports = router;