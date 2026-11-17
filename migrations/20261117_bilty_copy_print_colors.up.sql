-- Choosable colors for Consignor / Consignee / Driver / Transport copies

CREATE TABLE IF NOT EXISTS bilty_copy_settings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  company_id BIGINT UNSIGNED NOT NULL,
  copy_type VARCHAR(30) NOT NULL,
  label VARCHAR(80) NOT NULL,
  color_hex VARCHAR(7) NOT NULL DEFAULT '#FFFFFF',
  color_name VARCHAR(40) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  status TINYINT NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_bilty_copy_company_type (company_id, copy_type),
  KEY idx_bilty_copy_company (company_id)
);
