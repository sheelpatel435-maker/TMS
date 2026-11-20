import { useEffect, useState } from "react";
import { endpoints } from "../api";

const empty = {
  name: "",
  mobile: "",
  email: "",
  address: "",
  password: ""
};

const dutyLabel = (row) => {
  const availability = String(row.availability_status || "AVAILABLE").toUpperCase();
  if (Number(row.status) !== 1 || availability === "INACTIVE") return "Inactive";
  if (availability === "ON_LEAVE") return "On Leave";
  if (availability === "ON_TRIP") return "On Trip";
  if (availability === "ASSIGNED") return "Assigned";
  return "Active";
};

const dutyClass = (label) => {
  if (label === "Active") return "badge badge-ok";
  if (label === "On Leave") return "badge badge-warn";
  if (label === "On Trip") return "badge badge-info";
  if (label === "Assigned") return "badge badge-info";
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
      setMsg(
        duty === "ACTIVE"
          ? "Helper marked Active (job ready)"
          : duty === "ON_LEAVE"
            ? "Helper marked On Leave"
            : "Helper deactivated"
      );
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
            Active = job ke liye ready. On Leave / Inactive = trip assign nahi hoga.
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
              <th>Job status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((h) => {
              const label = dutyLabel(h);
              const onTrip = label === "On Trip";
              const busy = busyId === h.id;
              return (
                <tr key={h.id}>
                  <td>{h.name}</td>
                  <td>{h.mobile}</td>
                  <td>{h.user_id || "—"}</td>
                  <td>
                    <span className={dutyClass(label)}>{label}</span>
                  </td>
                  <td>
                    <div className="actions" style={{ marginTop: 0 }}>
                      {label !== "Active" && !onTrip ? (
                        <button
                          type="button"
                          className="btn btn-primary"
                          disabled={busy}
                          onClick={() => setDuty(h.id, "ACTIVE")}
                        >
                          Set Active
                        </button>
                      ) : null}
                      {label !== "On Leave" && !onTrip ? (
                        <button
                          type="button"
                          className="btn"
                          disabled={busy}
                          onClick={() => setDuty(h.id, "ON_LEAVE")}
                        >
                          On Leave
                        </button>
                      ) : null}
                      {label !== "Inactive" && !onTrip ? (
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
                        <span className="muted">Trip finish hone ke baad change hoga</span>
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
