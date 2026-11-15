-- BRD §4 Multi-Company / Tenant Architecture
-- 1) company-scoped vehicle_types
-- 2) composite unique (company_id, id) on parents
-- 3) composite foreign keys for tenant-safe relationships
-- Runtime also applies this via config/schema.js ensureSchema().

ALTER TABLE refresh_tokens
  ADD COLUMN IF NOT EXISTS active_company_id BIGINT UNSIGNED NULL DEFAULT NULL;

ALTER TABLE vehicle_types
  ADD COLUMN IF NOT EXISTS company_id BIGINT UNSIGNED NULL;

-- Application bootstrap clones shared types per company before NOT NULL + FKs.
