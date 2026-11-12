ALTER TABLE vehicles
    ADD COLUMN make VARCHAR(100) NULL AFTER registration_no,
    ADD COLUMN model VARCHAR(100) NULL AFTER make;

ALTER TABLE vehicle_documents
    ADD COLUMN verification_status
        ENUM('PENDING', 'VERIFIED', 'REJECTED') NOT NULL DEFAULT 'PENDING'
        AFTER status;

ALTER TABLE vehicle_assignments
    ADD KEY idx_vehicle_assignments_company_vehicle_dates
        (company_id, vehicle_id, is_active, start_date, end_date),
    ADD KEY idx_vehicle_assignments_company_driver_dates
        (company_id, driver_id, is_active, start_date, end_date),
    ADD KEY idx_vehicle_assignments_company_helper_dates
        (company_id, helper_id, is_active, start_date, end_date);

CREATE TABLE vehicle_document_types (
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
);

CREATE TABLE vehicle_trip_assignment_history (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    company_id BIGINT UNSIGNED NOT NULL,
    trip_id BIGINT UNSIGNED NOT NULL,
    vehicle_id BIGINT UNSIGNED NOT NULL,
    driver_id BIGINT UNSIGNED NOT NULL,
    helper_id BIGINT UNSIGNED NULL,
    trip_start_date DATETIME NULL,
    trip_end_date DATETIME NULL,
    completed_at DATETIME NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_vehicle_trip_assignment_company_trip (company_id, trip_id),
    KEY idx_vehicle_trip_history_company_vehicle (company_id, vehicle_id, completed_at),
    KEY idx_vehicle_trip_history_company_driver (company_id, driver_id, completed_at),
    KEY idx_vehicle_trip_history_company_helper (company_id, helper_id, completed_at)
);

INSERT IGNORE INTO vehicle_trip_assignment_history
    (company_id, trip_id, vehicle_id, driver_id, helper_id,
     trip_start_date, trip_end_date, completed_at)
SELECT company_id, id, vehicle_id, driver_id, helper_id,
       start_date, end_date, COALESCE(end_date, updated_at, created_at)
FROM trips
WHERE status = 'COMPLETED';
