-- Separate DRIVER and HELPER vehicle assignments + editable history support
-- Runtime also applies via config/schema.js ensureSeparateDriverHelperAssignments()

ALTER TABLE vehicle_assignments
  ADD COLUMN IF NOT EXISTS assignment_role ENUM('DRIVER','HELPER') NULL;

-- Backfill + split of combined rows is handled in ensureSchema JS for safety.
