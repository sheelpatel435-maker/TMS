import { useEffect, useState } from "react";
import { endpoints, getStoredUser } from "../api";
import { useAuth } from "../auth";

const empty = {
  name: "",
  admin_name: "",
  admin_mobile: "",
  admin_email: "",
  admin_password: ""
};

export default function Companies() {
  const { user, isSuperAdmin, applySession } = useAuth();
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(empty);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const activeCompanyId = user?.company_id || getStoredUser()?.company_id;

  const load = () =>
    endpoints
      .companies()
      .then((d) => setRows(d.companies || []))
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    setError("");
    try {
      await endpoints.createCompany(form);
      setForm(empty);
      setMsg("Company + Company Admin created");
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const selectCompany = async (companyId) => {
    setMsg("");
    setError("");
    try {
      const data = await endpoints.selectCompany({
        company_id: companyId,
        refresh_token: localStorage.getItem("tms_refresh")
      });
      applySession(data);
      setMsg(`Company context set to #${companyId}`);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <div className="topbar">
        <div>
          <h1 style={{ margin: 0 }}>Companies</h1>
          <p className="muted">
            Super Admin creates company and its Company Admin together (BRD flow).
          </p>
        </div>
      </div>

      <form className="card stack" onSubmit={onSubmit}>
        <h3>Create company</h3>
        <div className="grid-2">
          <label className="field">
            <span>Company name</span>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Admin name</span>
            <input
              required
              value={form.admin_name}
              onChange={(e) => setForm({ ...form, admin_name: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Admin mobile</span>
            <input
              required
              value={form.admin_mobile}
              onChange={(e) => setForm({ ...form, admin_mobile: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Admin email</span>
            <input
              type="email"
              value={form.admin_email}
              onChange={(e) => setForm({ ...form, admin_email: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Admin password (8+ letter+number)</span>
            <input
              type="password"
              required
              value={form.admin_password}
              onChange={(e) => setForm({ ...form, admin_password: e.target.value })}
            />
          </label>
        </div>
        <div className="actions">
          <button className="btn btn-primary">Create company + admin</button>
        </div>
        {msg ? <p className="ok">{msg}</p> : null}
        {error ? <p className="error">{error}</p> : null}
      </form>

      <div className="card">
        <h3>All companies</h3>
        <p className="muted">
          Super Admin must select a company context first. Tenant APIs never trust
          client-sent company_id — only the signed session.
          {activeCompanyId ? ` Active company #${activeCompanyId}.` : ""}
        </p>
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td>{c.id}</td>
                <td>{c.name}</td>
                <td>{Number(c.status) === 1 ? "Active" : "Inactive"}</td>
                <td>
                  {isSuperAdmin && Number(c.status) === 1 ? (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => selectCompany(c.id)}
                    >
                      {Number(activeCompanyId) === Number(c.id)
                        ? "Selected"
                        : "Use company"}
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
