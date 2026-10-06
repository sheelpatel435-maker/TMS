const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");
const db = require("./db");
const biltyRoutes = require("./routes/bilties");
const companyRoutes = require("./routes/companies");
const vehicleRoutes = require("./routes/vehicles");
const driverRoutes = require("./routes/drivers");
const helperRoutes = require("./routes/helpers");
const clientRoutes = require("./routes/clients");
const tripRoutes = require("./routes/trips");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(
    "/api/companies",
    companyRoutes
);

app.use(
    "/api/vehicles",
    vehicleRoutes
);
app.use(
    "/api/trips",
    tripRoutes
);
app.use(
    "/api/drivers",
    driverRoutes
);
app.use(
    "/api/clients",
    clientRoutes
);
app.use(
    "/api/helpers",
    helperRoutes
);

app.use(
    "/api/bilties",
    biltyRoutes
);
app.get("/api", (req, res) => {
    res.json({
        success: true,
        message: "TMS API is working"
    });
});

function authenticateToken(req, res, next) {
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

        const token = parts[1];

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        req.user = decoded;

        next();
    } catch (error) {
        console.error("AUTH ERROR:", error);

        return res.status(401).json({
            success: false,
            message: "Invalid or expired token"
        });
    }
}

app.post("/api/register", async (req, res) => {
    try {
        const {
            name,
            email,
            mobile,
            password,
            company_id
        } = req.body;

        if (
            !name ||
            !email ||
            !mobile ||
            !password ||
            !company_id
        ) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        const emailPattern =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailPattern.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Invalid email address"
            });
        }

        const mobilePattern =
            /^[0-9]{7,20}$/;

        if (!mobilePattern.test(mobile)) {
            return res.status(400).json({
                success: false,
                message: "Invalid mobile number"
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters"
            });
        }

        const [companyRows] =
            await db.execute(
                `SELECT id
                 FROM companies
                 WHERE id = ?
                 AND status = 1
                 LIMIT 1`,
                [company_id]
            );

        if (companyRows.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Selected company does not exist"
            });
        }

        const [existingEmail] =
            await db.execute(
                `SELECT id
                 FROM users
                 WHERE email = ?
                 LIMIT 1`,
                [email]
            );

        if (existingEmail.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Email already registered"
            });
        }

        const [existingMobile] =
            await db.execute(
                `SELECT id
                 FROM users
                 WHERE mobile = ?
                 LIMIT 1`,
                [mobile]
            );

        if (existingMobile.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Phone number already registered"
            });
        }

        const passwordHash =
            await bcrypt.hash(password, 10);

        const [result] =
            await db.execute(
                `INSERT INTO users
                (
                    company_id,
                    user_type,
                    name,
                    mobile,
                    email,
                    password_hash,
                    status
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    company_id,
                    "COMPANY_USER",
                    name,
                    mobile,
                    email,
                    passwordHash,
                    1
                ]
            );

        return res.status(201).json({
            success: true,
            message: "Registration successful. Please login.",
            user_id: result.insertId
        });
    } catch (error) {
        console.error("REGISTRATION ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
});
app.post("/api/login", async (req, res) => {
    try {
        const {
            email,
            password
        } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        const [rows] =
            await db.execute(
                `SELECT
                        id,
                        company_id,
                        user_type,
                        name,
                        mobile,
                        email,
                        password_hash,
                        status
                    FROM users
                    WHERE email = ?
                    LIMIT 1`,
                [email]
            );

        if (rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const user = rows[0];

        if (user.status !== 1) {
            return res.status(403).json({
                success: false,
                message: "User account is inactive"
            });
        }

        const passwordMatch =
            await bcrypt.compare(
                password,
                user.password_hash
            );

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const token =
            jwt.sign(
                {
                    user_id: user.id,
                    company_id: user.company_id,
                    user_type: user.user_type
                },
                process.env.JWT_SECRET,
                {
                    expiresIn: "1h"
                }
            );

        return res.status(200).json({
            success: true,
            message: "Login successful",
            token: token,
            user: {
                id: user.id,
                company_id: user.company_id,
                user_type: user.user_type,
                name: user.name,
                mobile: user.mobile,
                email: user.email
            }
        });
    } catch (error) {
        console.error("LOGIN ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
});

app.get(
    "/api/profile",
    authenticateToken,
    async (req, res) => {
        try {
            const [rows] =
                await db.execute(
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
                    [req.user.user_id]
                );

            if (rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "User not found"
                });
            }

            return res.status(200).json({
                success: true,
                user: rows[0]
            });
        } catch (error) {
            console.error("PROFILE GET ERROR:", error);

            return res.status(500).json({
                success: false,
                message: "Server error"
            });
        }
    }
);

app.put(
    "/api/profile",
    authenticateToken,
    async (req, res) => {
        try {
            const {
                name,
                email,
                mobile
            } = req.body;

            if (!name || !email || !mobile) {
                return res.status(400).json({
                    success: false,
                    message: "Name, email and mobile are required"
                });
            }

            const emailPattern =
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (!emailPattern.test(email)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid email address"
                });
            }

            const mobilePattern =
                /^[0-9]{7,20}$/;

            if (!mobilePattern.test(mobile)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid mobile number"
                });
            }

            const userId =
                req.user.user_id;

            const [emailRows] =
                await db.execute(
                    `SELECT id
                        FROM users
                        WHERE email = ?
                        AND id <> ?
                        LIMIT 1`,
                    [
                        email,
                        userId
                    ]
                );

            if (emailRows.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: "Email already registered"
                });
            }

            const [mobileRows] =
                await db.execute(
                    `SELECT id
                        FROM users
                        WHERE mobile = ?
                        AND id <> ?
                        LIMIT 1`,
                    [
                        mobile,
                        userId
                    ]
                );

            if (mobileRows.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: "Phone number already registered"
                });
            }

            await db.execute(
                `UPDATE users
                    SET
                        name = ?,
                        email = ?,
                        mobile = ?
                    WHERE id = ?`,
                [
                    name,
                    email,
                    mobile,
                    userId
                ]
            );

            const [updatedRows] =
                await db.execute(
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
                    [userId]
                );

            return res.status(200).json({
                success: true,
                message: "Profile updated successfully",
                user: updatedRows[0]
            });
        } catch (error) {
            console.error("PROFILE UPDATE ERROR:", error);

            return res.status(500).json({
                success: false,
                message: "Server error"
            });
        }
    }
);

app.get(
    "/api/dashboard",
    authenticateToken,
    async (req, res) => {
        try {
            const companyId =
                req.user.company_id;

            if (companyId === null) {
                return res.status(200).json({
                    success: true,
                    message: "User is not assigned to a company",
                    stats: {
                        vehicles: 0,
                        drivers: 0,
                        helpers: 0,
                        clients: 0,
                        bilties: 0,
                        trips: 0,
                        invoices: 0
                    }
                });
            }

            const [vehicleRows] =
                await db.execute(
                    `SELECT COUNT(*) AS total
                        FROM vehicles
                        WHERE company_id = ?`,
                    [companyId]
                );

            const [driverRows] =
                await db.execute(
                    `SELECT COUNT(*) AS total
                        FROM drivers
                        WHERE company_id = ?`,
                    [companyId]
                );

            const [helperRows] =
                await db.execute(
                    `SELECT COUNT(*) AS total
                        FROM helpers
                        WHERE company_id = ?`,
                    [companyId]
                );

            const [clientRows] =
                await db.execute(
                    `SELECT COUNT(*) AS total
                        FROM clients
                        WHERE company_id = ?`,
                    [companyId]
                );

            const [biltyRows] =
                await db.execute(
                    `SELECT COUNT(*) AS total
                        FROM bilties
                        WHERE company_id = ?`,
                    [companyId]
                );

            const [tripRows] =
                await db.execute(
                    `SELECT COUNT(*) AS total
                        FROM trips
                        WHERE company_id = ?`,
                    [companyId]
                );

            const [invoiceRows] =
                await db.execute(
                    `SELECT COUNT(*) AS total
                        FROM invoices
                        WHERE company_id = ?`,
                    [companyId]
                );

            return res.status(200).json({
                success: true,
                stats: {
                    vehicles: vehicleRows[0].total,
                    drivers: driverRows[0].total,
                    helpers: helperRows[0].total,
                    clients: clientRows[0].total,
                    bilties: biltyRows[0].total,
                    trips: tripRows[0].total,
                    invoices: invoiceRows[0].total
                }
            });
        } catch (error) {
            console.error("DASHBOARD ERROR:", error);

            return res.status(500).json({
                success: false,
                message: "Server error"
            });
        }
    }
);

const PORT = 5000;

app.listen(PORT, () => {
    console.log(
        `TMS Server running on http://localhost:${PORT}`
    );
});