-- BRD field completion: bilty freight, client billing, settlement carry-forward, invoice HSN

ALTER TABLE bilties
  ADD COLUMN IF NOT EXISTS freight_amount DECIMAL(12,2) NULL DEFAULT NULL;

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS billing_email VARCHAR(150) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS state_code VARCHAR(10) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(100) NULL DEFAULT NULL;

ALTER TABLE trip_settlements
  ADD COLUMN IF NOT EXISTS carry_forward_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00;

ALTER TABLE invoice_items
  ADD COLUMN IF NOT EXISTS hsn_sac VARCHAR(20) NULL DEFAULT '996791';
