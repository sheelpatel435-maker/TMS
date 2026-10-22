// Dead legacy route — not mounted in server.js. Use tripRoutes.js.
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
                vehicle_id,
                driver_id,
                helper_id,
                bilty_id,
                client_id,
                source,
                destination,
                start_date,
                end_date,
                status,
                created_at,
                updated_at
             FROM trips
             WHERE company_id = ?
             ORDER BY id DESC`,
            [companyId]
        );

        return res.status(200).json({
            success: true,
            trips: rows
        });

    } catch (error) {
        console.error("GET TRIPS ERROR:", error);

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
            vehicle_id,
            driver_id,
            helper_id,
            bilty_id,
            client_id,
            source,
            destination,
            start_date,
            end_date,
            status
        } = req.body;

        if (!source) {
            return res.status(400).json({
                success: false,
                message: "Source is required"
            });
        }

        if (!destination) {
            return res.status(400).json({
                success: false,
                message: "Destination is required"
            });
        }

        if (vehicle_id) {
            const [vehicleRows] = await db.execute(
                `SELECT id
                 FROM vehicles
                 WHERE id = ?
                 AND company_id = ?
                 LIMIT 1`,
                [vehicle_id, companyId]
            );

            if (vehicleRows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Vehicle not found"
                });
            }
        }

        if (driver_id) {
            const [driverRows] = await db.execute(
                `SELECT id
                 FROM drivers
                 WHERE id = ?
                 AND company_id = ?
                 LIMIT 1`,
                [driver_id, companyId]
            );

            if (driverRows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Driver not found"
                });
            }
        }

        if (helper_id) {
            const [helperRows] = await db.execute(
                `SELECT id
                 FROM helpers
                 WHERE id = ?
                 AND company_id = ?
                 LIMIT 1`,
                [helper_id, companyId]
            );

            if (helperRows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Helper not found"
                });
            }
        }

        if (client_id) {
            const [clientRows] = await db.execute(
                `SELECT id
                 FROM clients
                 WHERE id = ?
                 AND company_id = ?
                 LIMIT 1`,
                [client_id, companyId]
            );

            if (clientRows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Client not found"
                });
            }
        }

        if (bilty_id) {
            const [biltyRows] = await db.execute(
                `SELECT id
                 FROM bilties
                 WHERE id = ?
                 AND company_id = ?
                 LIMIT 1`,
                [bilty_id, companyId]
            );

            if (biltyRows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Bilty not found"
                });
            }
        }

        const [result] = await db.execute(
            `INSERT INTO trips
            (
                company_id,
                vehicle_id,
                driver_id,
                helper_id,
                bilty_id,
                client_id,
                source,
                destination,
                start_date,
                end_date,
                status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                companyId,
                vehicle_id || null,
                driver_id || null,
                helper_id || null,
                bilty_id || null,
                client_id || null,
                source,
                destination,
                start_date || null,
                end_date || null,
                status || "PLANNED"
            ]
        );

        return res.status(201).json({
            success: true,
            message: "Trip created successfully",
            trip_id: result.insertId
        });

    } catch (error) {
        console.error("CREATE TRIP ERROR:", error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;