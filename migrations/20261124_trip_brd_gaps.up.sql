-- BRD gaps: trip documents, multi-bilty, expense types, settlement verifier

CREATE TABLE IF NOT EXISTS trip_documents (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    company_id BIGINT UNSIGNED NOT NULL,
    trip_id BIGINT UNSIGNED NOT NULL,
    document_type VARCHAR(80) NOT NULL,
    document_url VARCHAR(500) NOT NULL,
    remarks VARCHAR(500) NULL,
    uploaded_by BIGINT UNSIGNED NULL,
    status TINYINT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_trip_documents_company_trip (company_id, trip_id),
    KEY idx_trip_documents_status (status)
);

CREATE TABLE IF NOT EXISTS trip_bilties (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    company_id BIGINT UNSIGNED NOT NULL,
    trip_id BIGINT UNSIGNED NOT NULL,
    bilty_id BIGINT UNSIGNED NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    status TINYINT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_trip_bilties_active (company_id, trip_id, bilty_id),
    KEY idx_trip_bilties_trip (company_id, trip_id),
    KEY idx_trip_bilties_bilty (company_id, bilty_id)
);

CREATE TABLE IF NOT EXISTS trip_expense_types (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    company_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(80) NOT NULL,
    code VARCHAR(40) NOT NULL,
    status TINYINT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_trip_expense_type_company_code (company_id, code),
    KEY idx_trip_expense_types_company (company_id, status)
);

ALTER TABLE trip_settlements
  ADD COLUMN IF NOT EXISTS verified_by BIGINT UNSIGNED NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS verified_at DATETIME NULL DEFAULT NULL;
