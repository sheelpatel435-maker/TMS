-- Race-safe company bilty number sequences + photo/BRD reserve fields

CREATE TABLE IF NOT EXISTS bilty_sequences (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    company_id BIGINT UNSIGNED NOT NULL,
    prefix VARCHAR(20) NOT NULL DEFAULT '',
    next_number BIGINT UNSIGNED NOT NULL DEFAULT 1,
    pad_width INT NOT NULL DEFAULT 5,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_bilty_sequences_company (company_id)
);

ALTER TABLE bilties
  ADD COLUMN IF NOT EXISTS eway_bill_no VARCHAR(50) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS delivery_office_address VARCHAR(255) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS from_no VARCHAR(100) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cancel_reason VARCHAR(500) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS reserved_by BIGINT UNSIGNED NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS created_by BIGINT UNSIGNED NULL DEFAULT NULL;

-- Soft uniqueness for company-scoped bilty numbers (ignore if already present)
-- Run carefully on DBs that may already have duplicates.
-- ALTER TABLE bilties ADD UNIQUE KEY uq_bilties_company_number (company_id, bilty_number);
