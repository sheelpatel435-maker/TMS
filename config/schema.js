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

const indexExists = async (table, indexName) => {
    const [rows] = await db.query(
        `SELECT INDEX_NAME
         FROM information_schema.STATISTICS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = ?
           AND INDEX_NAME = ?
         LIMIT 1`,
        [table, indexName]
    );

    return rows.length > 0;
};

const foreignKeyExists = async (table, constraintName) => {
    const [rows] = await db.query(
        `SELECT CONSTRAINT_NAME
         FROM information_schema.TABLE_CONSTRAINTS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = ?
           AND CONSTRAINT_NAME = ?
           AND CONSTRAINT_TYPE = 'FOREIGN KEY'
         LIMIT 1`,
        [table, constraintName]
    );

    return rows.length > 0;
};

/** Best-effort: ignore failures on dirty legacy rows so boot never blocks. */
const tryAlter = async (sql) => {
    try {
        await db.query(sql);
    } catch (error) {
        if (process.env.NODE_ENV !== "production") {
            console.warn("[ensureSchema]", error.code || error.message, sql.slice(0, 120));
        }
    }
};

/**
 * BRD §4 multi-tenant: composite uniqueness on (company_id, id) so child
 * tables can FK both company and parent row together.
 */
const ensureTenantCompositeGuards = async () => {
    const parents = [
        "vehicles",
        "drivers",
        "helpers",
        "clients",
        "bilties",
        "trips",
        "invoices",
        "users"
    ];

    for (const table of parents) {
        if (!(await tableExists(table))) {
            continue;
        }

        const indexName = `uq_${table}_company_id`;
        if (!(await indexExists(table, indexName))) {
            await tryAlter(
                `ALTER TABLE ${table} ADD UNIQUE KEY ${indexName} (company_id, id)`
            );
        }
    }

    const compositeFks = [
        {
            table: "vehicle_documents",
            name: "fk_vehicle_documents_vehicle_company",
            cols: "(company_id, vehicle_id)",
            ref: "vehicles (company_id, id)"
        },
        {
            table: "driver_documents",
            name: "fk_driver_documents_driver_company",
            cols: "(company_id, driver_id)",
            ref: "drivers (company_id, id)"
        },
        {
            table: "helper_documents",
            name: "fk_helper_documents_helper_company",
            cols: "(company_id, helper_id)",
            ref: "helpers (company_id, id)"
        },
        {
            table: "bilties",
            name: "fk_bilties_client_company",
            cols: "(company_id, client_id)",
            ref: "clients (company_id, id)"
        },
        {
            table: "trips",
            name: "fk_trips_vehicle_company",
            cols: "(company_id, vehicle_id)",
            ref: "vehicles (company_id, id)"
        },
        {
            table: "trips",
            name: "fk_trips_driver_company",
            cols: "(company_id, driver_id)",
            ref: "drivers (company_id, id)"
        },
        {
            table: "trips",
            name: "fk_trips_bilty_company",
            cols: "(company_id, bilty_id)",
            ref: "bilties (company_id, id)"
        },
        {
            table: "trip_advances",
            name: "fk_trip_advances_trip_company",
            cols: "(company_id, trip_id)",
            ref: "trips (company_id, id)"
        },
        {
            table: "trip_expenses",
            name: "fk_trip_expenses_trip_company",
            cols: "(company_id, trip_id)",
            ref: "trips (company_id, id)"
        },
        {
            table: "trip_settlements",
            name: "fk_trip_settlements_trip_company",
            cols: "(company_id, trip_id)",
            ref: "trips (company_id, id)"
        },
        {
            table: "trip_final_reports",
            name: "fk_trip_final_reports_trip_company",
            cols: "(company_id, trip_id)",
            ref: "trips (company_id, id)"
        },
        {
            table: "trip_stops",
            name: "fk_trip_stops_trip_company",
            cols: "(company_id, trip_id)",
            ref: "trips (company_id, id)"
        },
        {
            table: "invoices",
            name: "fk_invoices_client_company",
            cols: "(company_id, client_id)",
            ref: "clients (company_id, id)"
        },
        {
            table: "invoice_taxes",
            name: "fk_invoice_taxes_invoice_company",
            cols: "(company_id, invoice_id)",
            ref: "invoices (company_id, id)"
        },
        {
            table: "invoice_payments",
            name: "fk_invoice_payments_invoice_company",
            cols: "(company_id, invoice_id)",
            ref: "invoices (company_id, id)"
        },
        {
            table: "trip_balance_ledger",
            name: "fk_ledger_trip_company",
            cols: "(company_id, trip_id)",
            ref: "trips (company_id, id)"
        },
        {
            table: "vehicle_assignments",
            name: "fk_vehicle_assignments_vehicle_company",
            cols: "(company_id, vehicle_id)",
            ref: "vehicles (company_id, id)"
        },
        {
            table: "vehicle_assignments",
            name: "fk_vehicle_assignments_driver_company",
            cols: "(company_id, driver_id)",
            ref: "drivers (company_id, id)"
        }
    ];

    for (const fk of compositeFks) {
        if (!(await tableExists(fk.table))) {
            continue;
        }

        if (await foreignKeyExists(fk.table, fk.name)) {
            continue;
        }

        await tryAlter(
            `ALTER TABLE ${fk.table}
             ADD CONSTRAINT ${fk.name}
             FOREIGN KEY ${fk.cols} REFERENCES ${fk.ref}
             ON DELETE RESTRICT ON UPDATE CASCADE`
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
        "vehicles",
        "make",
        "VARCHAR(100) NULL DEFAULT NULL"
    );
    await addColumnIfMissing(
        "vehicles",
        "model",
        "VARCHAR(100) NULL DEFAULT NULL"
    );
    await addColumnIfMissing(
        "vehicles",
        "ownership",
        "VARCHAR(50) NULL DEFAULT NULL"
    );

    await addColumnIfMissing(
        "vehicle_documents",
        "verification_status",
        "ENUM('PENDING','VERIFIED','REJECTED') NOT NULL DEFAULT 'PENDING'"
    );

    await db.query(`
        CREATE TABLE IF NOT EXISTS vehicle_document_types (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            company_id BIGINT UNSIGNED NOT NULL,
            name VARCHAR(50) NOT NULL,
            status TINYINT(1) NOT NULL DEFAULT 1,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uq_vehicle_document_type_company_name (company_id, name),
            KEY idx_vehicle_document_types_company_status (company_id, status)
        )
    `);

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
    await addColumnIfMissing(
        "bilties",
        "freight_amount",
        "DECIMAL(12,2) NULL DEFAULT NULL"
    );

    await addColumnIfMissing(
        "clients",
        "billing_email",
        "VARCHAR(150) NULL DEFAULT NULL"
    );
    await addColumnIfMissing(
        "clients",
        "state_code",
        "VARCHAR(10) NULL DEFAULT NULL"
    );
    await addColumnIfMissing(
        "clients",
        "payment_terms",
        "VARCHAR(100) NULL DEFAULT NULL"
    );

    await addColumnIfMissing(
        "trip_settlements",
        "carry_forward_amount",
        "DECIMAL(12,2) NOT NULL DEFAULT 0.00"
    );

    await addColumnIfMissing(
        "invoice_items",
        "hsn_sac",
        "VARCHAR(20) NULL DEFAULT '996791'"
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
            token_version INT NULL DEFAULT NULL,
            revoked_at DATETIME NULL DEFAULT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uq_refresh_hash (token_hash),
            KEY idx_refresh_user (user_id)
        )
    `);
    await addColumnIfMissing(
        "refresh_tokens",
        "token_version",
        "INT NULL DEFAULT NULL"
    );

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

    await addColumnIfMissing(
        "drivers",
        "user_id",
        "BIGINT UNSIGNED NULL DEFAULT NULL"
    );
    await addColumnIfMissing(
        "helpers",
        "user_id",
        "BIGINT UNSIGNED NULL DEFAULT NULL"
    );

    await addColumnIfMissing(
        "trip_expenses",
        "submitted_by",
        "BIGINT UNSIGNED NULL DEFAULT NULL"
    );

    // Expand enums toward BRD lifecycles (keeps legacy values)
    await db.query(`
        ALTER TABLE bilties
        MODIFY COLUMN status ENUM(
            'RESERVED','DRAFT','CREATED','CONFIRMED','USED','COMPLETED','CANCELLED'
        ) NOT NULL DEFAULT 'DRAFT'
    `);

    await db.query(`
        ALTER TABLE trips
        MODIFY COLUMN status ENUM(
            'DRAFT','CREATED','BILTY_LINKED','READY_FOR_DISPATCH',
            'DISPATCHED','IN_TRANSIT','DELIVERED','FINAL_REPORT_SUBMITTED',
            'VERIFIED','COMPLETED','CLOSED','CANCELLED'
        ) NOT NULL DEFAULT 'DRAFT'
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS trip_balance_ledger (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            company_id BIGINT UNSIGNED NOT NULL,
            trip_id BIGINT UNSIGNED NOT NULL,
            driver_id BIGINT UNSIGNED NULL,
            settlement_id BIGINT UNSIGNED NULL,
            entry_type ENUM('CREDIT','DEBIT','CARRY_FORWARD') NOT NULL,
            amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
            balance_after DECIMAL(12,2) NOT NULL DEFAULT 0.00,
            reference_trip_id BIGINT UNSIGNED NULL,
            remarks VARCHAR(500) NULL,
            created_by BIGINT UNSIGNED NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_ledger_company (company_id),
            KEY idx_ledger_trip (trip_id),
            KEY idx_ledger_driver (driver_id)
        )
    `);

    await ensureTenantCompositeGuards();
};

module.exports = {
    ensureSchema
};
