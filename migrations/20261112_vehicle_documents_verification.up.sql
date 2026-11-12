ALTER TABLE vehicle_documents
  ADD COLUMN IF NOT EXISTS verification_status
    ENUM('PENDING','VERIFIED','REJECTED') NOT NULL DEFAULT 'PENDING';

CREATE TABLE IF NOT EXISTS vehicle_document_types (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  company_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(50) NOT NULL,
  status TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_vehicle_document_type_company_name (company_id, name),
  KEY idx_vehicle_document_types_company_status (company_id, status)
);
