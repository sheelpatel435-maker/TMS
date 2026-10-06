const bcrypt = require("bcryptjs");

const db = require("./db");

async function createUser() {

    try {

        // Check company
        const [companies] = await db.execute(
            "SELECT id FROM companies LIMIT 1"
        );


        let companyId;


        // Create company if none exists
        if (companies.length === 0) {

            const [companyResult] = await db.execute(
                `INSERT INTO companies (name, status)
                 VALUES (?, ?)`,
                ["TMS Demo Company", 1]
            );

            companyId = companyResult.insertId;

        } else {

            companyId = companies[0].id;

        }


        // Password hash
        const passwordHash = await bcrypt.hash(
            "123456",
            10
        );


        // Check existing user
        const [users] = await db.execute(
            "SELECT id FROM users WHERE mobile = ? LIMIT 1",
            ["9876543210"]
        );


        if (users.length > 0) {

            console.log("Test user already exists");

            process.exit();

        }


        // Create user
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
                companyId,
                "COMPANY_ADMIN",
                "Test Admin",
                "9876543210",
                "admin@tms.com",
                passwordHash,
                1
            ]
        );


        console.log("User created successfully");

        console.log("Mobile: 9876543210");

        console.log("Password: 123456");


        process.exit();


    } catch (error) {

        console.error(error);

        process.exit(1);

    }

}

createUser();