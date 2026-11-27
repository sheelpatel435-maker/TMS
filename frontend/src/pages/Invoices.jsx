import { useEffect, useState } from "react";
import { endpoints } from "../api";

const empty = {
  client_id: "",
  invoice_number: "",
  invoice_date: "",
  due_date: "",
  service_description: "Transportation of Goods by Road",
  hsn_sac: "996791",
  payment_terms: "",
  tax_preference: "",
  trip_id: "",
  bilty_id: "",
  description: "Transportation of Goods by Road",
  consignor_name: "",
  consignor_invoice_no: "",
  from_location: "",
  destination: "",
  vehicle_number: "",
  gr_lr_number: "",
  quantity: "",
  quantity_unit: "",
  freight: "",
  detention: "",
  hamali: "",
  other_charges: "",
  tax_amount: "",
  cgst_amount: "",
  sgst_amount: "",
  igst_amount: ""
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

  const onClientChange = (clientId) => {
    const client = clients.find((c) => Number(c.id) === Number(clientId));
    setForm({
      ...form,
      client_id: clientId,
      payment_terms: client?.payment_terms || form.payment_terms,
      tax_preference: client?.tax_preference || form.tax_preference || "AUTO"
    });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    setError("");
    try {
      const freight = Number(form.freight || 0);
      const detention = Number(form.detention || 0);
      const hamali = Number(form.hamali || 0);
      const other = Number(form.other_charges || 0);
      const hasLine =
        freight ||
        detention ||
        hamali ||
        other ||
        form.description ||
        form.trip_id;

      await endpoints.createInvoice({
        client_id: Number(form.client_id),
        invoice_number: form.invoice_number,
        invoice_date: form.invoice_date,
        due_date: form.due_date || undefined,
        service_description: form.service_description || undefined,
        hsn_sac: form.hsn_sac || undefined,
        payment_terms: form.payment_terms || undefined,
        tax_preference: form.tax_preference || undefined,
        tax_amount: form.tax_amount ? Number(form.tax_amount) : 0,
        cgst_amount: form.cgst_amount ? Number(form.cgst_amount) : undefined,
        sgst_amount: form.sgst_amount ? Number(form.sgst_amount) : undefined,
        igst_amount: form.igst_amount ? Number(form.igst_amount) : undefined,
        items: hasLine
          ? [
              {
                trip_id: form.trip_id ? Number(form.trip_id) : undefined,
                bilty_id: form.bilty_id ? Number(form.bilty_id) : undefined,
                description: form.description || undefined,
                hsn_sac: form.hsn_sac || undefined,
                consignor_name: form.consignor_name || undefined,
                consignor_invoice_no: form.consignor_invoice_no || undefined,
                from_location: form.from_location || undefined,
                destination: form.destination || undefined,
                vehicle_number: form.vehicle_number || undefined,
                gr_lr_number: form.gr_lr_number || undefined,
                quantity: form.quantity ? Number(form.quantity) : undefined,
                quantity_unit: form.quantity_unit || undefined,
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

  const approve = async (id) => {
    setError("");
    try {
      await endpoints.approveInvoice(id);
      setMsg("Invoice approved");
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const generatePdf = async (id) => {
    setError("");
    try {
      const result = await endpoints.generateInvoicePdf(id);
      setMsg(result.message || "PDF generated");
      if (result.print_url) {
        window.open(result.print_url, "_blank");
      }
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const email = async (id) => {
    setError("");
    try {
      const result = await endpoints.emailInvoice(id);
      setMsg(
        `Emailed / logged to: ${(result.recipients || []).join(", ") || "—"}`
      );
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
            BRD §14–15: DRAFT → APPROVED → PDF/Email (SENT) → PARTIAL / PAID.
            TDS is applied on payments, not on invoice gross.
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
              onChange={(e) => onClientChange(e.target.value)}
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
            <span>Service description</span>
            <input
              value={form.service_description}
              onChange={(e) =>
                setForm({ ...form, service_description: e.target.value })
              }
            />
          </label>
          <label className="field">
            <span>HSN / SAC</span>
            <input
              value={form.hsn_sac}
              onChange={(e) => setForm({ ...form, hsn_sac: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Payment terms</span>
            <input
              value={form.payment_terms}
              onChange={(e) =>
                setForm({ ...form, payment_terms: e.target.value })
              }
            />
          </label>
          <label className="field">
            <span>Tax preference</span>
            <select
              value={form.tax_preference}
              onChange={(e) =>
                setForm({ ...form, tax_preference: e.target.value })
              }
            >
              <option value="">Use client default</option>
              <option value="AUTO">AUTO (CGST+SGST)</option>
              <option value="CGST_SGST">CGST + SGST</option>
              <option value="IGST">IGST</option>
            </select>
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
            <span>Line description</span>
            <input
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </label>
          <label className="field">
            <span>Consignor</span>
            <input
              value={form.consignor_name}
              onChange={(e) =>
                setForm({ ...form, consignor_name: e.target.value })
              }
            />
          </label>
          <label className="field">
            <span>Consignor invoice no</span>
            <input
              value={form.consignor_invoice_no}
              onChange={(e) =>
                setForm({ ...form, consignor_invoice_no: e.target.value })
              }
            />
          </label>
          <label className="field">
            <span>From</span>
            <input
              value={form.from_location}
              onChange={(e) =>
                setForm({ ...form, from_location: e.target.value })
              }
            />
          </label>
          <label className="field">
            <span>Destination</span>
            <input
              value={form.destination}
              onChange={(e) =>
                setForm({ ...form, destination: e.target.value })
              }
            />
          </label>
          <label className="field">
            <span>Vehicle number</span>
            <input
              value={form.vehicle_number}
              onChange={(e) =>
                setForm({ ...form, vehicle_number: e.target.value })
              }
            />
          </label>
          <label className="field">
            <span>GR / LR number</span>
            <input
              value={form.gr_lr_number}
              onChange={(e) =>
                setForm({ ...form, gr_lr_number: e.target.value })
              }
            />
          </label>
          <label className="field">
            <span>Quantity</span>
            <input
              type="number"
              min="0"
              step="0.001"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Qty unit</span>
            <input
              value={form.quantity_unit}
              onChange={(e) =>
                setForm({ ...form, quantity_unit: e.target.value })
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
            <span>Total GST amount (split by preference)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.tax_amount}
              onChange={(e) => setForm({ ...form, tax_amount: e.target.value })}
            />
          </label>
          <label className="field">
            <span>CGST (optional override)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.cgst_amount}
              onChange={(e) =>
                setForm({ ...form, cgst_amount: e.target.value })
              }
            />
          </label>
          <label className="field">
            <span>SGST (optional override)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.sgst_amount}
              onChange={(e) =>
                setForm({ ...form, sgst_amount: e.target.value })
              }
            />
          </label>
          <label className="field">
            <span>IGST (optional override)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.igst_amount}
              onChange={(e) =>
                setForm({ ...form, igst_amount: e.target.value })
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
                      onClick={() => approve(inv.id)}
                    >
                      Approve
                    </button>
                  ) : null}
                  {["APPROVED", "SENT", "PARTIAL"].includes(inv.status) ? (
                    <>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => generatePdf(inv.id)}
                      >
                        PDF
                      </button>
                      {inv.status === "APPROVED" ? (
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => email(inv.id)}
                        >
                          Email → SENT
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => email(inv.id)}
                        >
                          Re-email
                        </button>
                      )}
                    </>
                  ) : null}
                  {inv.status === "DRAFT" ? (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => setStatus(inv.id, "SENT")}
                    >
                      Mark SENT
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
