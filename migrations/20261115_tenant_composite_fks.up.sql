-- BRD §4 Multi-Company / Tenant: composite uniqueness + FKs
-- Prefer running via ensureSchema (best-effort). This file documents the intent.

-- Parent uniqueness required for composite FKs
ALTER TABLE vehicles ADD UNIQUE KEY uq_vehicles_company_id (company_id, id);
ALTER TABLE drivers ADD UNIQUE KEY uq_drivers_company_id (company_id, id);
ALTER TABLE helpers ADD UNIQUE KEY uq_helpers_company_id (company_id, id);
ALTER TABLE clients ADD UNIQUE KEY uq_clients_company_id (company_id, id);
ALTER TABLE bilties ADD UNIQUE KEY uq_bilties_company_id (company_id, id);
ALTER TABLE trips ADD UNIQUE KEY uq_trips_company_id (company_id, id);
ALTER TABLE invoices ADD UNIQUE KEY uq_invoices_company_id (company_id, id);
ALTER TABLE users ADD UNIQUE KEY uq_users_company_id (company_id, id);

-- Child rows must share the same company as their parent
ALTER TABLE vehicle_documents
  ADD CONSTRAINT fk_vehicle_documents_vehicle_company
  FOREIGN KEY (company_id, vehicle_id) REFERENCES vehicles (company_id, id);

ALTER TABLE driver_documents
  ADD CONSTRAINT fk_driver_documents_driver_company
  FOREIGN KEY (company_id, driver_id) REFERENCES drivers (company_id, id);

ALTER TABLE helper_documents
  ADD CONSTRAINT fk_helper_documents_helper_company
  FOREIGN KEY (company_id, helper_id) REFERENCES helpers (company_id, id);

ALTER TABLE bilties
  ADD CONSTRAINT fk_bilties_client_company
  FOREIGN KEY (company_id, client_id) REFERENCES clients (company_id, id);

ALTER TABLE trips
  ADD CONSTRAINT fk_trips_vehicle_company
  FOREIGN KEY (company_id, vehicle_id) REFERENCES vehicles (company_id, id);

ALTER TABLE trips
  ADD CONSTRAINT fk_trips_driver_company
  FOREIGN KEY (company_id, driver_id) REFERENCES drivers (company_id, id);

ALTER TABLE trips
  ADD CONSTRAINT fk_trips_bilty_company
  FOREIGN KEY (company_id, bilty_id) REFERENCES bilties (company_id, id);

ALTER TABLE trip_advances
  ADD CONSTRAINT fk_trip_advances_trip_company
  FOREIGN KEY (company_id, trip_id) REFERENCES trips (company_id, id);

ALTER TABLE trip_expenses
  ADD CONSTRAINT fk_trip_expenses_trip_company
  FOREIGN KEY (company_id, trip_id) REFERENCES trips (company_id, id);

ALTER TABLE trip_settlements
  ADD CONSTRAINT fk_trip_settlements_trip_company
  FOREIGN KEY (company_id, trip_id) REFERENCES trips (company_id, id);

ALTER TABLE trip_final_reports
  ADD CONSTRAINT fk_trip_final_reports_trip_company
  FOREIGN KEY (company_id, trip_id) REFERENCES trips (company_id, id);

ALTER TABLE trip_stops
  ADD CONSTRAINT fk_trip_stops_trip_company
  FOREIGN KEY (company_id, trip_id) REFERENCES trips (company_id, id);

ALTER TABLE invoices
  ADD CONSTRAINT fk_invoices_client_company
  FOREIGN KEY (company_id, client_id) REFERENCES clients (company_id, id);

ALTER TABLE invoice_taxes
  ADD CONSTRAINT fk_invoice_taxes_invoice_company
  FOREIGN KEY (company_id, invoice_id) REFERENCES invoices (company_id, id);

ALTER TABLE invoice_payments
  ADD CONSTRAINT fk_invoice_payments_invoice_company
  FOREIGN KEY (company_id, invoice_id) REFERENCES invoices (company_id, id);

ALTER TABLE trip_balance_ledger
  ADD CONSTRAINT fk_ledger_trip_company
  FOREIGN KEY (company_id, trip_id) REFERENCES trips (company_id, id);

ALTER TABLE vehicle_assignments
  ADD CONSTRAINT fk_vehicle_assignments_vehicle_company
  FOREIGN KEY (company_id, vehicle_id) REFERENCES vehicles (company_id, id);

ALTER TABLE vehicle_assignments
  ADD CONSTRAINT fk_vehicle_assignments_driver_company
  FOREIGN KEY (company_id, driver_id) REFERENCES drivers (company_id, id);
