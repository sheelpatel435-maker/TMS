import { useEffect, useState } from "react";
import { endpoints } from "../api";

const empty = {
  name: "",
  mobile: "",
  email: "",
  billing_email: "",
  address: "",
  gst_number: "",
  state_code: "",
  payment_terms: ""
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
      await endpoints.createClient(form);
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
            Billing party master for invoices / bilty. Flow: Client → Invoice → Payment.
          </p>
        </div>
      </div>

      <form className="card stack" onSubmit={onSubmit}>
        <h3>Add client</h3>
        <div className="grid-2">
          {[
            ["name", "Name", true],
            ["mobile", "Mobile", false],
            ["email", "Email", false],
            ["billing_email", "Billing email", false],
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
        </div>
        <button className="btn btn-primary">Create client</button>
      </form>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Mobile</th>
              <th>GST</th>
              <th>Terms</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.mobile || "—"}</td>
                <td>{c.gst_number || "—"}</td>
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
