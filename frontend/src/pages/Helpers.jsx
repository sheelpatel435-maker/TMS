import { useEffect, useState } from "react";
import { endpoints } from "../api";

const empty = {
  name: "",
  mobile: "",
  email: "",
  address: "",
  password: ""
};

const statusLabel = (row) => (Number(row.status) === 1 ? "Active" : "Inactive");

const availabilityLabel = (row) => {
  const value = String(row.availability_status || "AVAILABLE").toUpperCase();
  if (["AVAILABLE", "ASSIGNED", "ON_TRIP", "INACTIVE"].includes(value)) {
    return value;
  }
  return "AVAILABLE";
};

const availabilityClass = (value) => {
  if (value === "AVAILABLE") return "badge badge-ok";
  if (value === "ASSIGNED") return "badge badge-info";
  if (value === "ON_TRIP") return "badge badge-info";
  return "badge badge-muted";
};

export default function Helpers() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(empty);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

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

  const setDuty = async (id, duty) => {
    setMsg("");
    setError("");
    setBusyId(id);
    try {
      await endpoints.setHelperDuty(id, duty);
      setMsg(duty === "ACTIVE" ? "Helper marked Active" : "Helper marked Inactive");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="topbar">
        <div>
          <h1 style={{ margin: 0 }}>Helpers</h1>
          <p className="muted">
            Status = Active/Inactive. Availability = AVAILABLE / ASSIGNED / ON_TRIP /
            INACTIVE.
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
              <th>Availability</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((h) => {
              const active = Number(h.status) === 1;
              const availability = availabilityLabel(h);
              const onTrip = availability === "ON_TRIP";
              const busy = busyId === h.id;
              return (
                <tr key={h.id}>
                  <td>{h.name}</td>
                  <td>{h.mobile}</td>
                  <td>{h.user_id || "—"}</td>
                  <td>
                    <span className={active ? "badge badge-ok" : "badge badge-muted"}>
                      {statusLabel(h)}
                    </span>
                  </td>
                  <td>
                    <span className={availabilityClass(availability)}>
                      {availability}
                    </span>
                  </td>
                  <td>
                    <div className="actions" style={{ marginTop: 0 }}>
                      {!active && !onTrip ? (
                        <button
                          type="button"
                          className="btn btn-primary"
                          disabled={busy}
                          onClick={() => setDuty(h.id, "ACTIVE")}
                        >
                          Activate
                        </button>
                      ) : null}
                      {active && !onTrip ? (
                        <button
                          type="button"
                          className="btn"
                          disabled={busy}
                          onClick={() => setDuty(h.id, "INACTIVE")}
                        >
                          Deactivate
                        </button>
                      ) : null}
                      {onTrip ? (
                        <span className="muted">On trip — finish after trip ends</span>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {msg ? <p className="ok">{msg}</p> : null}
      {error ? <p className="error">{error}</p> : null}
    </div>
  );
}
