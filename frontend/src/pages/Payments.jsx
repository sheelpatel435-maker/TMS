import { useEffect, useState } from "react";
import { endpoints } from "../api";

const METHODS = ["CASH", "UPI", "NEFT", "CHEQUE", "BANK_TRANSFER"];

const empty = {
  invoice_id: "",
  payment_date: "",
  amount: "",
  deduction_amount: "",
  payment_method: "NEFT",
  reference_no: "",
  deduction_type: "TDS",
  deduction_line_amount: "",
  deduction_remarks: ""
};

export default function Payments() {
  const [rows, setRows] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [form, setForm] = useState(empty);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    const [payments, invoiceData] = await Promise.all([
      endpoints.payments(),
      endpoints.invoices().catch(() => ({ invoices: [] }))
    ]);
    setRows(payments.payments || []);
    setInvoices(
      (invoiceData.invoices || []).filter(
        (inv) => !["DRAFT", "CANCELLED", "PAID"].includes(inv.status)
      )
    );
  };

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    setError("");
    try {
      const created = await endpoints.createPayment({
        invoice_id: Number(form.invoice_id),
        payment_date: form.payment_date,
        amount: Number(form.amount),
        deduction_amount: form.deduction_amount
          ? Number(form.deduction_amount)
          : 0,
        payment_method: form.payment_method,
        reference_no: form.reference_no || undefined
      });

      if (form.deduction_line_amount && created.payment_id) {
        await endpoints.createPaymentDeduction({
          invoice_payment_id: created.payment_id,
          deduction_type: form.deduction_type || "TDS",
          amount: Number(form.deduction_line_amount),
          remarks: form.deduction_remarks || undefined
        });
      }

      setForm(empty);
      setMsg("Payment created as PENDING — confirm to apply to invoice");
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const setStatus = async (id, status) => {
    setError("");
    try {
      await endpoints.updatePaymentStatus(id, status);
      setMsg(`Payment → ${status}`);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <div className="topbar">
        <div>
          <h1 style={{ margin: 0 }}>Payments</h1>
          <p className="muted">
            Flow: PENDING → CONFIRMED (updates invoice balance to PARTIAL / PAID)
          </p>
        </div>
      </div>

      <form className="card stack" onSubmit={onSubmit}>
        <h3>Record payment</h3>
        <div className="grid-2">
          <label className="field">
            <span>Invoice</span>
            <select
              required
              value={form.invoice_id}
              onChange={(e) => setForm({ ...form, invoice_id: e.target.value })}
            >
              <option value="">Select SENT / PARTIAL invoice</option>
              {invoices.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoice_number} · bal {inv.balance_amount} · {inv.status}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Payment date</span>
            <input
              type="date"
              required
              value={form.payment_date}
              onChange={(e) =>
                setForm({ ...form, payment_date: e.target.value })
              }
            />
          </label>
          <label className="field">
            <span>Gross amount</span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              required
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Header deduction (optional)</span>
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
          <label className="field">
            <span>Method</span>
            <select
              value={form.payment_method}
              onChange={(e) =>
                setForm({ ...form, payment_method: e.target.value })
              }
            >
              {METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Reference no</span>
            <input
              value={form.reference_no}
              onChange={(e) =>
                setForm({ ...form, reference_no: e.target.value })
              }
            />
          </label>
          <label className="field">
            <span>Line deduction type</span>
            <select
              value={form.deduction_type}
              onChange={(e) =>
                setForm({ ...form, deduction_type: e.target.value })
              }
            >
              <option value="TDS">TDS</option>
              <option value="OTHER">OTHER</option>
            </select>
          </label>
          <label className="field">
            <span>Line deduction amount (optional)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.deduction_line_amount}
              onChange={(e) =>
                setForm({ ...form, deduction_line_amount: e.target.value })
              }
            />
          </label>
          <label className="field">
            <span>Deduction remarks</span>
            <input
              value={form.deduction_remarks}
              onChange={(e) =>
                setForm({ ...form, deduction_remarks: e.target.value })
              }
            />
          </label>
        </div>
        <button className="btn btn-primary">Create PENDING payment</button>
      </form>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Invoice</th>
              <th>Date</th>
              <th>Gross</th>
              <th>Net</th>
              <th>Method</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td>#{p.id}</td>
                <td>{p.invoice_id}</td>
                <td>{p.payment_date}</td>
                <td>{p.gross_amount}</td>
                <td>{p.net_received_amount}</td>
                <td>{p.payment_method}</td>
                <td>
                  <span className="badge">{p.status}</span>
                </td>
                <td style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                  {p.status === "PENDING" ? (
                    <>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => setStatus(p.id, "CONFIRMED")}
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => setStatus(p.id, "CANCELLED")}
                      >
                        Cancel
                      </button>
                    </>
                  ) : null}
                  {p.status === "CONFIRMED" ? (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => setStatus(p.id, "CANCELLED")}
                    >
                      Reverse
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
