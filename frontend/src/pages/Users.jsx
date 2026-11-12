import { useEffect, useState } from "react";
import { endpoints } from "../api";

const empty = { name: "", mobile: "", email: "", password: "" };

export default function Users() {
  const [rows, setRows] = useState([]);
  const [modules, setModules] = useState([]);
  const [form, setForm] = useState(empty);
  const [selectedUser, setSelectedUser] = useState(null);
  const [actions, setActions] = useState({});
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    const [users, mods] = await Promise.all([
      endpoints.users(),
      endpoints.modules().catch(() => ({ modules: [] }))
    ]);
    setRows(users.users || []);
    setModules(mods.modules || mods.rows || []);
  };

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  const onCreate = async (e) => {
    e.preventDefault();
    setMsg("");
    setError("");
    try {
      await endpoints.createUser(form);
      setForm(empty);
      setMsg("Company User created. Assign module access below.");
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleAction = (moduleId, flag) => {
    setActions((prev) => {
      const current = new Set(prev[moduleId] || []);
      if (current.has(flag)) current.delete(flag);
      else current.add(flag);
      return { ...prev, [moduleId]: [...current] };
    });
  };

  const saveAccess = async () => {
    if (!selectedUser) return;
    setMsg("");
    setError("");
    try {
      const permissions = Object.entries(actions)
        .filter(([, flags]) => flags.length)
        .map(([module_id, flags]) => ({
          module_id: Number(module_id),
          actions: flags
        }));
      await endpoints.setUserAccess(selectedUser.id, { permissions });
      setMsg(`Access saved for ${selectedUser.name}`);
    } catch (err) {
      setError(err.message);
    }
  };

  const flags = [
    "can_view",
    "can_create",
    "can_update",
    "can_delete",
    "can_approve",
    "can_dispatch",
    "can_export",
    "can_close"
  ];

  return (
    <div>
      <div className="topbar">
        <div>
          <h1 style={{ margin: 0 }}>Users</h1>
          <p className="muted">
            Company Admin creates COMPANY_USER and assigns module/action checklist (no Roles UI).
          </p>
        </div>
      </div>

      <form className="card stack" onSubmit={onCreate}>
        <h3>Add Company User</h3>
        <div className="grid-2">
          {["name", "mobile", "email", "password"].map((key) => (
            <label className="field" key={key}>
              <span>{key}</span>
              <input
                type={key === "password" ? "password" : "text"}
                required={key !== "email"}
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              />
            </label>
          ))}
        </div>
        <button className="btn btn-primary">Create user</button>
      </form>

      <div className="card">
        <h3>Company users</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Mobile</th>
              <th>Email</th>
              <th>Type</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.mobile}</td>
                <td>{u.email || "—"}</td>
                <td>
                  <span className="badge">{u.user_type}</span>
                </td>
                <td>
                  {u.user_type === "COMPANY_USER" ? (
                    <button
                      className="btn btn-ghost"
                      type="button"
                      onClick={() => {
                        setSelectedUser(u);
                        setActions({});
                      }}
                    >
                      Assign access
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedUser ? (
        <div className="card">
          <h3>Module access — {selectedUser.name}</h3>
          <p className="muted">Direct checklist, no role dropdown.</p>
          {modules.map((m) => (
            <div key={m.id} style={{ marginBottom: "0.8rem" }}>
              <strong>{m.name}</strong>
              <div className="actions">
                {flags.map((flag) => (
                  <label key={flag} className="muted" style={{ display: "flex", gap: 6 }}>
                    <input
                      type="checkbox"
                      checked={(actions[m.id] || []).includes(flag)}
                      onChange={() => toggleAction(m.id, flag)}
                    />
                    {flag.replace("can_", "")}
                  </label>
                ))}
              </div>
            </div>
          ))}
          <button className="btn btn-primary" type="button" onClick={saveAccess}>
            Save access
          </button>
        </div>
      ) : null}

      {msg ? <p className="ok">{msg}</p> : null}
      {error ? <p className="error">{error}</p> : null}
    </div>
  );
}
