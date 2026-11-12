ALTER TABLE vehicle_assignments
    DROP INDEX idx_vehicle_assignments_company_vehicle_active;

ALTER TABLE vehicle_documents
    DROP INDEX idx_vehicle_documents_company_status_expiry;

ALTER TABLE vehicles
    DROP INDEX idx_vehicles_company_status,
    DROP INDEX uq_vehicles_company_registration,
    DROP COLUMN ownership;
