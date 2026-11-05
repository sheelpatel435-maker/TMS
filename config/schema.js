const db = require("./db");

const columnExists = async (table, column) => {
    const [rows] = await db.query(
        `SHOW COLUMNS FROM ${table} LIKE ?`,
        [column]
    );

    return rows.length > 0;
};

const tableExists = async (table) => {
    const [rows] = await db.query(
        `SELECT TABLE_NAME
         FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = ?`,
        [table]
    );

    return rows.length > 0;
};

const addColumnIfMissing = async (table, column, definition) => {
    if (!(await columnExists(table, column))) {
        await db.query(
            `ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`
        );
    }
};

const ensureSchema = async () => {
    await addColumnIfMissing(
        "users",
        "last_login_at",
        "TIMESTAMP NULL DEFAULT NULL"
    );

    await addColumnIfMissing(
        "users",
        "token_version",
        "INT NOT NULL DEFAULT 1"
    );

    await addColumnIfMissing(
        "users",
        "otp_hash",
        "VARCHAR(255) NULL DEFAULT NULL"
    );

    await addColumnIfMissing(
        "users",
        "otp_expires_at",
        "DATETIME NULL DEFAULT NULL"
    );

    await addColumnIfMissing(
        "users",
        "otp_attempts",
        "INT NOT NULL DEFAULT 0"
    );

    await addColumnIfMissing(
        "users",
        "password_changed_at",
        "TIMESTAMP NULL DEFAULT NULL"
    );

    await addColumnIfMissing(
        "invoices",
        "due_date",
        "DATE NULL DEFAULT NULL"
    );

    await addColumnIfMissing(
        "trip_final_reports",
        "loaded_quantity",
        "DECIMAL(12,2) NULL DEFAULT NULL"
    );

    await addColumnIfMissing(
        "bilties",
        "goods_description",
        "VARCHAR(255) NULL DEFAULT NULL"
    );
    await addColumnIfMissing(
        "bilties",
        "weight_kg",
        "DECIMAL(12,2) NULL DEFAULT NULL"
    );
    await addColumnIfMissing(
        "bilties",
        "packages",
        "INT NULL DEFAULT NULL"
    );
    await addColumnIfMissing(
        "bilties",
        "consignor",
        "VARCHAR(150) NULL DEFAULT NULL"
    );
    await addColumnIfMissing(
        "bilties",
        "consignee",
        "VARCHAR(150) NULL DEFAULT NULL"
    );
    await addColumnIfMissing(
        "bilties",
        "pickup_location",
        "VARCHAR(150) NULL DEFAULT NULL"
    );
    await addColumnIfMissing(
        "bilties",
        "drop_location",
        "VARCHAR(150) NULL DEFAULT NULL"
    );

    await db.query(`
        CREATE TABLE IF NOT EXISTS revoked_tokens (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            jti VARCHAR(64) NOT NULL,
            user_id BIGINT UNSIGNED NOT NULL,
            expires_at DATETIME NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uq_revoked_jti (jti),
            KEY idx_revoked_user (user_id),
            KEY idx_revoked_expires (expires_at)
        )
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS refresh_tokens (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id BIGINT UNSIGNED NOT NULL,
            token_hash VARCHAR(64) NOT NULL,
            expires_at DATETIME NOT NULL,
            revoked_at DATETIME NULL DEFAULT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uq_refresh_hash (token_hash),
            KEY idx_refresh_user (user_id)
        )
    `);

    if (!(await tableExists("trip_final_reports"))) {
        await db.query(`
            CREATE TABLE trip_final_reports (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                company_id BIGINT UNSIGNED NOT NULL,
                trip_id BIGINT UNSIGNED NOT NULL,
                report_no VARCHAR(100) NOT NULL,
                final_odometer_start DECIMAL(12,2) NULL,
                final_odometer_end DECIMAL(12,2) NULL,
                total_distance_km DECIMAL(12,2) NULL,
                loaded_quantity DECIMAL(12,2) NULL,
                loading_date DATETIME NULL,
                unloading_date DATETIME NULL,
                remarks VARCHAR(500) NULL,
                submitted_by BIGINT UNSIGNED NULL,
                verified_by BIGINT UNSIGNED NULL,
                verified_at DATETIME NULL,
                status ENUM('SUBMITTED','VERIFIED','REJECTED') NOT NULL DEFAULT 'SUBMITTED',
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY uq_company_report_no (company_id, report_no),
                KEY idx_final_report_company (company_id),
                KEY idx_final_report_trip (trip_id)
            )
        `);
    }

    await db.query(`
        CREATE TABLE IF NOT EXISTS trip_stops (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            company_id BIGINT UNSIGNED NOT NULL,
            trip_id BIGINT UNSIGNED NOT NULL,
            sequence INT NOT NULL,
            city VARCHAR(150) NOT NULL,
            address VARCHAR(255) NULL,
            eta DATETIME NULL,
            status ENUM('PENDING','ARRIVED') NOT NULL DEFAULT 'PENDING',
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_trip_stops_trip (trip_id),
            KEY idx_trip_stops_company (company_id)
        )
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS invoice_taxes (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            company_id BIGINT UNSIGNED NOT NULL,
            invoice_id BIGINT UNSIGNED NOT NULL,
            tax_type VARCHAR(50) NOT NULL,
            tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
            taxable_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
            tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_invoice_taxes_company (company_id),
            KEY idx_invoice_taxes_invoice (invoice_id)
        )
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS access_logs (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            company_id BIGINT UNSIGNED NULL,
            user_id BIGINT UNSIGNED NULL,
            session_id VARCHAR(255) NULL,
            method VARCHAR(10) NOT NULL,
            endpoint VARCHAR(255) NOT NULL,
            ip_address VARCHAR(45) NULL,
            user_agent VARCHAR(500) NULL,
            response_status SMALLINT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_access_company (company_id),
            KEY idx_access_user (user_id),
            KEY idx_access_created (created_at)
        )
    `);

    if (!(await tableExists("audit_logs"))) {
        await db.query(`
            CREATE TABLE audit_logs (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                company_id BIGINT UNSIGNED NULL,
                user_id BIGINT UNSIGNED NULL,
                action VARCHAR(100) NOT NULL,
                entity_type VARCHAR(100) NULL,
                entity_id BIGINT UNSIGNED NULL,
                description VARCHAR(500) NULL,
                ip_address VARCHAR(45) NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                KEY idx_audit_company (company_id),
                KEY idx_audit_user (user_id)
            )
        `);
    }
};

module.exports = {
    ensureSchema
};
