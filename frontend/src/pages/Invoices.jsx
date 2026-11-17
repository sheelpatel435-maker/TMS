import { useEffect, useState } from "react";
import { endpoints } from "../api";

const empty = {
  client_id: "",
  invoice_number: "",
  invoice_date: "",
  due_date: "",
  trip_id: "",
  bilty_id: "",
  description: "",
  freight: "",
  detention: "",
  hamali: "",
  other_charges: "",
  tax_amount: "",
  deduction_amount: ""
};

export default function Invoices() {
  const [rows, setRows] = useState([]);
  const [clients, setClients] = useState([]);
  const [trips, setTrips] = useState([]);
  const [bilties, setBilties] = useState([]);
  const [form, setForm] = useState(empty);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    const [invoices, clientData, tripData, biltyData] = await Promise.all([
      endpoints.invoices(),
      endpoints.clients().catch(() => ({ clients: [] })),
      endpoints.trips().catch(() => ({ trips: [] })),
      endpoints.bilties().catch(() => ({ bilties: [] }))
    ]);
    setRows(invoices.invoices || []);
    setClients(clientData.clients || []);
    setTrips(tripData.trips || []);
    setBilties(biltyData.bilties || []);
  };

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    setError("");
    try {
      const freight = Number(form.freight || 0);
      const detention = Number(form.detention || 0);
      const hamali = Number(form.hamali || 0);
      const other = Number(form.other_charges || 0);
      const hasLine = freight || detention || hamali || other || form.description;

      await endpoints.createInvoice({
        client_id: Number(form.client_id),
        invoice_number: form.invoice_number,
        invoice_date: form.invoice_date,
        due_date: form.due_date || undefined,
        tax_amount: form.tax_amount ? Number(form.tax_amount) : 0,
        deduction_amount: form.deduction_amount
          ? Number(form.deduction_amount)
          : 0,
        items: hasLine
          ? [
              {
                trip_id: form.trip_id ? Number(form.trip_id) : undefined,
                bilty_id: form.bilty_id ? Number(form.bilty_id) : undefined,
                description: form.description || undefined,
                freight,
                detention,
                hamali,
                other_charges: other
              }
            ]
          : []
      });
      setForm(empty);
      setMsg("Invoice created as DRAFT");
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const setStatus = async (id, status) => {
    setError("");
    try {
      await endpoints.updateInvoiceStatus(id, status);
      setMsg(`Invoice → ${status}`);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <div className="topbar">
        <div>
          <h1 style={{ margin: 0 }}>Invoices</h1>
          <p className="muted">
            Flow: DRAFT → SENT → PARTIAL / PAID (payments update balance)
          </p>
        </div>
      </div>

      <form className="card stack" onSubmit={onSubmit}>
        <h3>Create invoice (DRAFT)</h3>
        <div className="grid-2">
          <label className="field">
            <span>Client</span>
            <select
              required
              value={form.client_id}
              onChange={(e) => setForm({ ...form, client_id: e.target.value })}
            >
              <option value="">Select client</option>
              {clients
                .filter((c) => Number(c.status) === 1)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="field">
            <span>Invoice number</span>
            <input
              required
              value={form.invoice_number}
              onChange={(e) =>
                setForm({ ...form, invoice_number: e.target.value })
              }
            />
          </label>
          <label className="field">
            <span>Invoice date</span>
            <input
              type="date"
              required
              value={form.invoice_date}
              onChange={(e) =>
                setForm({ ...form, invoice_date: e.target.value })
              }
            />
          </label>
          <label className="field">
            <span>Due date</span>
            <input
              type="date"
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Trip (optional)</span>
            <select
              value={form.trip_id}
              onChange={(e) => setForm({ ...form, trip_id: e.target.value })}
            >
              <option value="">None</option>
              {trips.map((t) => (
                <option key={t.id} value={t.id}>
                  #{t.id} {t.source} → {t.destination}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Bilty (optional)</span>
            <select
              value={form.bilty_id}
              onChange={(e) => setForm({ ...form, bilty_id: e.target.value })}
            >
              <option value="">None</option>
              {bilties.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.bilty_number}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Description</span>
            <input
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </label>
          <label className="field">
            <span>Freight</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.freight}
              onChange={(e) => setForm({ ...form, freight: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Detention</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.detention}
              onChange={(e) => setForm({ ...form, detention: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Hamali</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.hamali}
              onChange={(e) => setForm({ ...form, hamali: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Other charges</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.other_charges}
              onChange={(e) =>
                setForm({ ...form, other_charges: e.target.value })
              }
            />
          </label>
          <label className="field">
            <span>Tax amount</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.tax_amount}
              onChange={(e) => setForm({ ...form, tax_amount: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Upfront deduction</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.deduction_amount}
              onChange={(e) =>
                setForm({ ...form, deduction_amount: e.target.value })
              }
            />
          </label>
        </div>
        <button className="btn btn-primary">Create DRAFT invoice</button>
      </form>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Number</th>
              <th>Client</th>
              <th>Date</th>
              <th>Total</th>
              <th>Balance</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((inv) => (
              <tr key={inv.id}>
                <td>{inv.invoice_number}</td>
                <td>
                  {clients.find((c) => Number(c.id) === Number(inv.client_id))
                    ?.name || inv.client_id}
                </td>
                <td>{inv.invoice_date}</td>
                <td>{inv.total_amount}</td>
                <td>{inv.balance_amount}</td>
                <td>
                  <span className="badge">{inv.status}</span>
                </td>
                <td style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                  {inv.status === "DRAFT" ? (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => setStatus(inv.id, "SENT")}
                    >
                      Send
                    </button>
                  ) : null}
                  {!["CANCELLED", "PAID"].includes(inv.status) ? (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => setStatus(inv.id, "CANCELLED")}
                    >
                      Cancel
                    </button>
                  ) : null}
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
