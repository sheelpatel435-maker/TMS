import { useEffect, useState } from "react";
import { endpoints } from "../api";

const empty = {
  name: "",
  mobile: "",
  email: "",
  address: "",
  license_number: "",
  password: ""
};

export default function Drivers() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(empty);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const load = () =>
    endpoints
      .drivers()
      .then((d) => setRows(d.drivers || []))
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    setError("");
    try {
      await endpoints.createDriver(form);
      setForm(empty);
      setMsg("Driver + mobile login created");
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <div className="topbar">
        <div>
          <h1 style={{ margin: 0 }}>Drivers</h1>
          <p className="muted">
            Creates driver master + DRIVER login user (mobile + password / OTP ready).
          </p>
        </div>
      </div>

      <form className="card stack" onSubmit={onSubmit}>
        <h3>Add driver</h3>
        <div className="grid-2">
          {[
            ["name", "Name"],
            ["mobile", "Registered mobile"],
            ["email", "Email"],
            ["address", "Address"],
            ["license_number", "DL number"],
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
        <button className="btn btn-primary">Create driver</button>
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
            {rows.map((d) => (
              <tr key={d.id}>
                <td>{d.name}</td>
                <td>{d.mobile}</td>
                <td>{d.user_id || "—"}</td>
                <td>{Number(d.status) === 1 ? "Active" : "Inactive"}</td>
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
