import { useEffect, useState } from "react";
import { endpoints } from "../api";

const TRIP_STATUSES = [
  "DRAFT",
  "BILTY_LINKED",
  "READY_FOR_DISPATCH",
  "DISPATCHED",
  "IN_TRANSIT",
  "DELIVERED",
  "FINAL_REPORT_SUBMITTED",
  "VERIFIED",
  "CLOSED",
  "CANCELLED"
];

const empty = {
  vehicle_id: "",
  driver_id: "",
  helper_id: "",
  bilty_id: "",
  client_id: "",
  source: "",
  destination: "",
  start_date: "",
  status: "DRAFT"
};

export default function Trips() {
  const [rows, setRows] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [helpers, setHelpers] = useState([]);
  const [bilties, setBilties] = useState([]);
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState(empty);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    const [trips, v, d, h, b, c] = await Promise.all([
      endpoints.trips(),
      endpoints.vehicles().catch(() => ({ vehicles: [] })),
      endpoints.drivers().catch(() => ({ drivers: [] })),
      endpoints.helpers().catch(() => ({ helpers: [] })),
      endpoints.bilties().catch(() => ({ bilties: [] })),
      endpoints.clients().catch(() => ({ clients: [] }))
    ]);
    setRows(trips.trips || []);
    setVehicles(v.vehicles || []);
    setDrivers(d.drivers || []);
    setHelpers(h.helpers || []);
    setBilties(b.bilties || []);
    setClients(c.clients || []);
  };

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  const onCreate = async (e) => {
    e.preventDefault();
    setMsg("");
    setError("");
    try {
      await endpoints.createTrip({
        ...form,
        vehicle_id: Number(form.vehicle_id),
        driver_id: Number(form.driver_id),
        helper_id: form.helper_id ? Number(form.helper_id) : null,
        bilty_id: form.bilty_id ? Number(form.bilty_id) : null,
        client_id: form.client_id ? Number(form.client_id) : null
      });
      setForm(empty);
      setMsg("Trip created");
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const setStatus = async (id, status) => {
    setError("");
    try {
      await endpoints.updateTripStatus(id, status);
      setMsg(`Trip → ${status}`);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <div className="topbar">
        <div>
          <h1 style={{ margin: 0 }}>Trips</h1>
          <p className="muted">
            DRAFT → BILTY_LINKED → READY_FOR_DISPATCH → DISPATCHED → IN_TRANSIT →
            DELIVERED → FINAL_REPORT_SUBMITTED → VERIFIED → CLOSED
          </p>
        </div>
      </div>

      <form className="card stack" onSubmit={onCreate}>
        <h3>Create trip</h3>
        <div className="grid-2">
          <label className="field">
            <span>Vehicle</span>
            <select
              required
              value={form.vehicle_id}
              onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })}
            >
              <option value="">Select</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.registration_no || v.vehicle_number || `#${v.id}`}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Driver</span>
            <select
              required
              value={form.driver_id}
              onChange={(e) => setForm({ ...form, driver_id: e.target.value })}
            >
              <option value="">Select</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Helper</span>
            <select
              value={form.helper_id}
              onChange={(e) => setForm({ ...form, helper_id: e.target.value })}
            >
              <option value="">Optional</option>
              {helpers.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Bilty</span>
            <select
              value={form.bilty_id}
              onChange={(e) => setForm({ ...form, bilty_id: e.target.value })}
            >
              <option value="">Optional</option>
              {bilties.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.bilty_number} ({b.status})
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Client</span>
            <select
              value={form.client_id}
              onChange={(e) => setForm({ ...form, client_id: e.target.value })}
            >
              <option value="">Optional</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Source</span>
            <input
              required
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Destination</span>
            <input
              required
              value={form.destination}
              onChange={(e) => setForm({ ...form, destination: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Start date</span>
            <input
              type="date"
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            />
          </label>
        </div>
        <button className="btn btn-primary">Create trip</button>
      </form>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Route</th>
              <th>Status</th>
              <th>Advance status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id}>
                <td>{t.id}</td>
                <td>
                  {t.source} → {t.destination}
                </td>
                <td>
                  <span className="badge">{t.status}</span>
                </td>
                <td>
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) setStatus(t.id, e.target.value);
                      e.target.value = "";
                    }}
                  >
                    <option value="">Change status…</option>
                    {TRIP_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {msg ? <p className="ok">{msg}</p> : null}
      {error ? <p className="error">{error}</p> : null}
    </div>
  );
}
