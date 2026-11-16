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
        `SELECT 1
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
        `SELECT 1
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

const addUniqueIfMissing = async (table, indexName, columnsSql) => {
    if (!(await tableExists(table)) || (await indexExists(table, indexName))) {
        return;
    }
    try {
        await db.query(
            `ALTER TABLE ${table} ADD UNIQUE KEY ${indexName} ${columnsSql}`
        );
    } catch (error) {
        console.warn(`Skip unique ${table}.${indexName}:`, error.message);
    }
};

const addForeignKeyIfMissing = async (table, constraintName, definitionSql) => {
    if (!(await tableExists(table)) || (await foreignKeyExists(table, constraintName))) {
        return;
    }
    try {
        await db.query(
            `ALTER TABLE ${table} ADD CONSTRAINT ${constraintName} ${definitionSql}`
        );
    } catch (error) {
        console.warn(`Skip FK ${table}.${constraintName}:`, error.message);
    }
};

const ensureVehicleTypesAreCompanyScoped = async () => {
    if (!(await tableExists("vehicle_types"))) {
        return;
    }

    await addColumnIfMissing(
        "vehicle_types",
        "company_id",
        "BIGINT UNSIGNED NULL"
    );

    // Clone shared types per company so each vehicle keeps a same-tenant type id.
    if (await tableExists("vehicles")) {
        const [pairs] = await db.query(
            `SELECT DISTINCT v.company_id, v.vehicle_type_id
             FROM vehicles v
             INNER JOIN vehicle_types vt ON vt.id = v.vehicle_type_id
             WHERE v.vehicle_type_id IS NOT NULL`
        );

        for (const pair of pairs) {
            const [typeRows] = await db.query(
                `SELECT id, name, status, company_id
                 FROM vehicle_types
                 WHERE id = ?
                 LIMIT 1`,
                [pair.vehicle_type_id]
            );
            const typeRow = typeRows[0];
            if (!typeRow) continue;

            if (Number(typeRow.company_id) === Number(pair.company_id)) {
                continue;
            }

            let targetTypeId = null;
            const [existing] = await db.query(
                `SELECT id
                 FROM vehicle_types
                 WHERE company_id = ? AND name = ?
                 LIMIT 1`,
                [pair.company_id, typeRow.name]
            );

            if (existing[0]) {
                targetTypeId = existing[0].id;
            } else {
                const [inserted] = await db.query(
                    `INSERT INTO vehicle_types (company_id, name, status)
                     VALUES (?, ?, ?)`,
                    [pair.company_id, typeRow.name, typeRow.status]
                );
                targetTypeId = inserted.insertId;
            }

            await db.query(
                `UPDATE vehicles
                 SET vehicle_type_id = ?
                 WHERE company_id = ? AND vehicle_type_id = ?`,
                [targetTypeId, pair.company_id, pair.vehicle_type_id]
            );
        }
    }

    // Orphan types with no company: attach to first company or leave for cleanup.
    const [companies] = await db.query(
        `SELECT id FROM companies ORDER BY id ASC LIMIT 1`
    );
    if (companies[0]) {
        await db.query(
            `UPDATE vehicle_types
             SET company_id = ?
             WHERE company_id IS NULL`,
            [companies[0].id]
        );
    }

    // Merge duplicate names within the same company before unique index.
    const [duplicates] = await db.query(
        `SELECT company_id, name, MIN(id) AS keep_id
         FROM vehicle_types
         WHERE company_id IS NOT NULL
         GROUP BY company_id, name
         HAVING COUNT(*) > 1`
    );

    for (const dup of duplicates) {
        const [extras] = await db.query(
            `SELECT id
             FROM vehicle_types
             WHERE company_id = ? AND name = ? AND id <> ?`,
            [dup.company_id, dup.name, dup.keep_id]
        );

        for (const extra of extras) {
            if (await tableExists("vehicles")) {
                await db.query(
                    `UPDATE vehicles
                     SET vehicle_type_id = ?
                     WHERE company_id = ? AND vehicle_type_id = ?`,
                    [dup.keep_id, dup.company_id, extra.id]
                );
            }
            await db.query(`DELETE FROM vehicle_types WHERE id = ?`, [extra.id]);
        }
    }

    try {
        await db.query(
            `ALTER TABLE vehicle_types
             MODIFY COLUMN company_id BIGINT UNSIGNED NOT NULL`
        );
    } catch (error) {
        console.warn("vehicle_types.company_id NOT NULL skipped:", error.message);
    }

    await addUniqueIfMissing(
        "vehicle_types",
        "uq_vehicle_types_company_name",
        "(company_id, name)"
    );
};

const ensureTenantCompositeKeys = async () => {
    const parentTables = [
        "vehicle_types",
        "vehicles",
        "drivers",
        "helpers",
        "clients",
        "bilties",
        "trips",
        "invoices",
        "invoice_payments",
        "trip_expenses",
        "trip_settlements",
        "trip_final_reports",
        "trip_advances"
    ];

    for (const table of parentTables) {
        await addUniqueIfMissing(
            table,
            `uq_${table}_company_id`,
            "(company_id, id)"
        );
    }

    const foreignKeys = [
        [
            "vehicles",
            "fk_vehicles_type_company",
            "FOREIGN KEY (company_id, vehicle_type_id) REFERENCES vehicle_types (company_id, id)"
        ],
        [
            "vehicle_documents",
            "fk_vehicle_documents_vehicle_company",
            "FOREIGN KEY (company_id, vehicle_id) REFERENCES vehicles (company_id, id)"
        ],
        [
            "vehicle_assignments",
            "fk_vehicle_assignments_vehicle_company",
            "FOREIGN KEY (company_id, vehicle_id) REFERENCES vehicles (company_id, id)"
        ],
        [
            "vehicle_assignments",
            "fk_vehicle_assignments_driver_company",
            "FOREIGN KEY (company_id, driver_id) REFERENCES drivers (company_id, id)"
        ],
        [
            "vehicle_assignments",
            "fk_vehicle_assignments_helper_company",
            "FOREIGN KEY (company_id, helper_id) REFERENCES helpers (company_id, id)"
        ],
        [
            "trips",
            "fk_trips_vehicle_company",
            "FOREIGN KEY (company_id, vehicle_id) REFERENCES vehicles (company_id, id)"
        ],
        [
            "trips",
            "fk_trips_driver_company",
            "FOREIGN KEY (company_id, driver_id) REFERENCES drivers (company_id, id)"
        ],
        [
            "trips",
            "fk_trips_helper_company",
            "FOREIGN KEY (company_id, helper_id) REFERENCES helpers (company_id, id)"
        ],
        [
            "trips",
            "fk_trips_bilty_company",
            "FOREIGN KEY (company_id, bilty_id) REFERENCES bilties (company_id, id)"
        ],
        [
            "trips",
            "fk_trips_client_company",
            "FOREIGN KEY (company_id, client_id) REFERENCES clients (company_id, id)"
        ],
        [
            "bilties",
            "fk_bilties_client_company",
            "FOREIGN KEY (company_id, client_id) REFERENCES clients (company_id, id)"
        ],
        [
            "trip_expenses",
            "fk_trip_expenses_trip_company",
            "FOREIGN KEY (company_id, trip_id) REFERENCES trips (company_id, id)"
        ],
        [
            "trip_settlements",
            "fk_trip_settlements_trip_company",
            "FOREIGN KEY (company_id, trip_id) REFERENCES trips (company_id, id)"
        ],
        [
            "trip_stops",
            "fk_trip_stops_trip_company",
            "FOREIGN KEY (company_id, trip_id) REFERENCES trips (company_id, id)"
        ],
        [
            "trip_final_reports",
            "fk_trip_final_reports_trip_company",
            "FOREIGN KEY (company_id, trip_id) REFERENCES trips (company_id, id)"
        ],
        [
            "trip_balance_ledger",
            "fk_trip_balance_ledger_trip_company",
            "FOREIGN KEY (company_id, trip_id) REFERENCES trips (company_id, id)"
        ],
        [
            "trip_advances",
            "fk_trip_advances_trip_company",
            "FOREIGN KEY (company_id, trip_id) REFERENCES trips (company_id, id)"
        ],
        [
            "invoices",
            "fk_invoices_client_company",
            "FOREIGN KEY (company_id, client_id) REFERENCES clients (company_id, id)"
        ],
        [
            "invoice_taxes",
            "fk_invoice_taxes_invoice_company",
            "FOREIGN KEY (company_id, invoice_id) REFERENCES invoices (company_id, id)"
        ],
        [
            "invoice_payments",
            "fk_invoice_payments_invoice_company",
            "FOREIGN KEY (company_id, invoice_id) REFERENCES invoices (company_id, id)"
        ],
        [
            "invoice_payment_deductions",
            "fk_invoice_payment_deductions_payment_company",
            "FOREIGN KEY (company_id, invoice_payment_id) REFERENCES invoice_payments (company_id, id)"
        ]
    ];

    for (const [table, name, definition] of foreignKeys) {
        await addForeignKeyIfMissing(table, name, definition);
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
    await addColumnIfMissing(
        "refresh_tokens",
        "active_company_id",
        "BIGINT UNSIGNED NULL DEFAULT NULL"
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
        "drivers",
        "availability_status",
        "VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE'"
    );
    await addColumnIfMissing(
        "helpers",
        "availability_status",
        "VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE'"
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

    await ensureVehicleTypesAreCompanyScoped();
    await ensureTenantCompositeKeys();
    await ensureSeparateDriverHelperAssignments();
};

const ensureSeparateDriverHelperAssignments = async () => {
    if (!(await tableExists("vehicle_assignments"))) {
        return;
    }

    await addColumnIfMissing(
        "vehicle_assignments",
        "assignment_role",
        "ENUM('DRIVER','HELPER') NULL"
    );

    // Backfill role from existing person columns
    await db.query(
        `UPDATE vehicle_assignments
         SET assignment_role = 'DRIVER'
         WHERE assignment_role IS NULL
           AND driver_id IS NOT NULL
           AND helper_id IS NULL`
    );
    await db.query(
        `UPDATE vehicle_assignments
         SET assignment_role = 'HELPER'
         WHERE assignment_role IS NULL
           AND helper_id IS NOT NULL
           AND driver_id IS NULL`
    );

    // Combined rows (old model): keep DRIVER on original, split HELPER into new row
    const [combined] = await db.query(
        `SELECT id, company_id, vehicle_id, driver_id, helper_id,
                start_date, end_date, is_active
         FROM vehicle_assignments
         WHERE driver_id IS NOT NULL AND helper_id IS NOT NULL`
    );

    for (const row of combined) {
        await db.query(
            `INSERT INTO vehicle_assignments
             (company_id, vehicle_id, assignment_role, driver_id, helper_id,
              start_date, end_date, is_active)
             VALUES (?, ?, 'HELPER', NULL, ?, ?, ?, ?)`,
            [
                row.company_id,
                row.vehicle_id,
                row.helper_id,
                row.start_date,
                row.end_date,
                row.is_active
            ]
        );
        await db.query(
            `UPDATE vehicle_assignments
             SET assignment_role = 'DRIVER',
                 helper_id = NULL
             WHERE id = ?`,
            [row.id]
        );
    }

    // Any remaining null role with only helper
    await db.query(
        `UPDATE vehicle_assignments
         SET assignment_role = 'HELPER'
         WHERE assignment_role IS NULL AND helper_id IS NOT NULL`
    );
    await db.query(
        `UPDATE vehicle_assignments
         SET assignment_role = 'DRIVER'
         WHERE assignment_role IS NULL AND driver_id IS NOT NULL`
    );

    try {
        await db.query(
            `ALTER TABLE vehicle_assignments
             MODIFY COLUMN assignment_role ENUM('DRIVER','HELPER') NOT NULL`
        );
    } catch (error) {
        console.warn(
            "vehicle_assignments.assignment_role NOT NULL skipped:",
            error.message
        );
    }

    await addUniqueIfMissing(
        "vehicle_assignments",
        "idx_vehicle_assignments_company_role_active",
        "(company_id, vehicle_id, assignment_role, is_active, start_date)"
    );
};

module.exports = {
    ensureSchema
};
