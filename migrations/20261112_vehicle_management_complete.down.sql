DROP TABLE vehicle_trip_assignment_history;
DROP TABLE vehicle_document_types;

ALTER TABLE vehicle_assignments
    DROP INDEX idx_vehicle_assignments_company_vehicle_dates,
    DROP INDEX idx_vehicle_assignments_company_driver_dates,
    DROP INDEX idx_vehicle_assignments_company_helper_dates;

ALTER TABLE vehicle_documents
    DROP COLUMN verification_status;

ALTER TABLE vehicles
    DROP COLUMN model,
    DROP COLUMN make;
