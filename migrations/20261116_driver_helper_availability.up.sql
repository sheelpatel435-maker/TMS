-- Driver / helper availability for trip workflow (no verification step — admin creates)

ALTER TABLE drivers ADD COLUMN availability_status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE';
ALTER TABLE helpers ADD COLUMN availability_status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE';
