ALTER TABLE vehicles
    ADD COLUMN ownership VARCHAR(50) NULL AFTER capacity,
    ADD UNIQUE KEY uq_vehicles_company_registration (company_id, registration_no),
    ADD KEY idx_vehicles_company_status (company_id, status);

ALTER TABLE vehicle_documents
    ADD KEY idx_vehicle_documents_company_status_expiry
        (company_id, status, expiry_date);

ALTER TABLE vehicle_assignments
    ADD KEY idx_vehicle_assignments_company_vehicle_active
        (company_id, vehicle_id, is_active);
