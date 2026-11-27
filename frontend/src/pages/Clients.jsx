import { useEffect, useState } from "react";
import { endpoints } from "../api";

const empty = {
  name: "",
  mobile: "",
  email: "",
  billing_email: "",
  contact_person: "",
  invoice_email_recipients: "",
  address: "",
  gst_number: "",
  state_code: "",
  payment_terms: "",
  tax_preference: "AUTO"
};

export default function Clients() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(empty);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const load = () =>
    endpoints
      .clients()
      .then((d) => setRows(d.clients || []))
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    setError("");
    try {
      await endpoints.createClient({
        ...form,
        invoice_email_recipients: form.invoice_email_recipients
          .split(/[,;\n]+/)
          .map((item) => item.trim())
          .filter(Boolean)
      });
      setForm(empty);
      setMsg("Client created");
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const deactivate = async (id) => {
    setError("");
    try {
      await endpoints.deactivateClient(id);
      setMsg("Client deactivated");
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <div className="topbar">
        <div>
          <h1 style={{ margin: 0 }}>Clients</h1>
          <p className="muted">
            Billing party master (BRD §13): contact, GST, tax preference, invoice
            recipients. Flow: Client → Invoice → Payment.
          </p>
        </div>
      </div>

      <form className="card stack" onSubmit={onSubmit}>
        <h3>Add client</h3>
        <div className="grid-2">
          {[
            ["name", "Name", true],
            ["contact_person", "Contact person", false],
            ["mobile", "Mobile", false],
            ["email", "Email", false],
            ["billing_email", "Billing email", false],
            ["invoice_email_recipients", "Invoice email recipients (comma)", false],
            ["gst_number", "GST number", false],
            ["state_code", "State code", false],
            ["payment_terms", "Payment terms", false],
            ["address", "Address", false]
          ].map(([key, label, required]) => (
            <label className="field" key={key}>
              <span>{label}</span>
              <input
                required={required}
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              />
            </label>
          ))}
          <label className="field">
            <span>Tax preference</span>
            <select
              value={form.tax_preference}
              onChange={(e) =>
                setForm({ ...form, tax_preference: e.target.value })
              }
            >
              <option value="AUTO">AUTO (CGST+SGST)</option>
              <option value="CGST_SGST">CGST + SGST</option>
              <option value="IGST">IGST</option>
            </select>
          </label>
        </div>
        <button className="btn btn-primary">Create client</button>
      </form>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Contact</th>
              <th>Mobile</th>
              <th>GST</th>
              <th>Tax</th>
              <th>Terms</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.contact_person || "—"}</td>
                <td>{c.mobile || "—"}</td>
                <td>{c.gst_number || "—"}</td>
                <td>{c.tax_preference || "AUTO"}</td>
                <td>{c.payment_terms || "—"}</td>
                <td>{Number(c.status) === 1 ? "Active" : "Inactive"}</td>
                <td>
                  {Number(c.status) === 1 ? (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => deactivate(c.id)}
                    >
                      Deactivate
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
