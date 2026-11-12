import { useEffect, useState } from "react";
import { endpoints } from "../api";

const empty = {
  name: "",
  mobile: "",
  email: "",
  address: "",
  password: ""
};

export default function Helpers() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(empty);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const load = () =>
    endpoints
      .helpers()
      .then((d) => setRows(d.helpers || []))
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    setError("");
    try {
      await endpoints.createHelper(form);
      setForm(empty);
      setMsg("Helper + mobile login created");
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <div className="topbar">
        <div>
          <h1 style={{ margin: 0 }}>Helpers</h1>
          <p className="muted">
            Creates helper master + HELPER login (mobile + password / OTP).
          </p>
        </div>
      </div>

      <form className="card stack" onSubmit={onSubmit}>
        <h3>Add helper</h3>
        <div className="grid-2">
          {[
            ["name", "Name"],
            ["mobile", "Registered mobile"],
            ["email", "Email"],
            ["address", "Address"],
            ["password", "Initial password"]
          ].map(([key, label]) => (
            <label className="field" key={key}>
              <span>{label}</span>
              <input
                type={key === "password" ? "password" : "text"}
                required={["name", "mobile", "password"].includes(key)}
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              />
            </label>
          ))}
        </div>
        <button className="btn btn-primary">Create helper</button>
      </form>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Mobile</th>
              <th>User ID</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((h) => (
              <tr key={h.id}>
                <td>{h.name}</td>
                <td>{h.mobile}</td>
                <td>{h.user_id || "—"}</td>
                <td>{Number(h.status) === 1 ? "Active" : "Inactive"}</td>
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
