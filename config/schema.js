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
};

module.exports = {
    ensureSchema
};
