const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const seed = async () => {
    const db = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT
    });

    const companyName = "TMS Demo Company";
    const email = "admin@tms.com";
    const password = "123456";
    const name = "TMS Admin";
    const mobile = "9876543210";

    const [existingCompany] = await db.execute(
        `SELECT id FROM companies WHERE name = ? LIMIT 1`,
        [companyName]
    );

    let companyId;

    if (existingCompany.length > 0) {
        companyId = existingCompany[0].id;
    } else {
        const [companyResult] = await db.execute(
            `INSERT INTO companies (name, status)
             VALUES (?, 1)`,
            [companyName]
        );

        companyId = companyResult.insertId;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [existingUser] = await db.execute(
        `SELECT id FROM users WHERE email = ? LIMIT 1`,
        [email]
    );

    if (existingUser.length > 0) {
        await db.execute(
            `UPDATE users
             SET company_id = ?,
                 user_type = 'COMPANY_ADMIN',
                 name = ?,
                 mobile = ?,
                 password_hash = ?,
                 status = 1
             WHERE email = ?`,
            [
                companyId,
                name,
                mobile,
                passwordHash,
                email
            ]
        );
    } else {
        await db.execute(
            `INSERT INTO users
            (company_id, user_type, name, mobile, email, password_hash, status)
            VALUES (?, 'COMPANY_ADMIN', ?, ?, ?, ?, 1)`,
            [
                companyId,
                name,
                mobile,
                email,
                passwordHash
            ]
        );
    }

    const demoHelpers = [
        ["Ramesh Helper", "9000000001"],
        ["Suresh Helper", "9000000002"]
    ];

    for (const [helperName, helperMobile] of demoHelpers) {
        const [existingHelper] = await db.execute(
            `SELECT id FROM helpers
             WHERE company_id = ? AND mobile = ?
             LIMIT 1`,
            [companyId, helperMobile]
        );

        if (existingHelper.length === 0) {
            await db.execute(
                `INSERT INTO helpers
                (company_id, name, mobile, status)
                VALUES (?, ?, ?, 1)`,
                [companyId, helperName, helperMobile]
            );
        }
    }

    console.log("Seed completed");
    console.log("Email:", email);
    console.log("Password:", password);

    await db.end();
};

seed().catch((error) => {
    console.error(error);
});