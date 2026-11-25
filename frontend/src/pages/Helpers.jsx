import { useEffect, useState } from "react";
import { endpoints } from "../api";

const emptyForm = {
  name: "",
  mobile: "",
  email: "",
  address: "",
  document_type: "AADHAAR",
  document_number: "",
  issue_date: "",
  expiry_date: "",
  password: ""
};

const emptyDoc = {
  document_type: "AADHAAR",
  document_number: "",
  issue_date: "",
  expiry_date: "",
  custom_type: "",
  file: null
};

const DOC_TYPES = ["AADHAAR", "PAN", "PHOTO", "ID_PROOF", "OTHER"];

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
  if (value === "ASSIGNED" || value === "ON_TRIP") return "badge badge-info";
  return "badge badge-muted";
};

export default function Helpers() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [idFile, setIdFile] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [docs, setDocs] = useState([]);
  const [history, setHistory] = useState([]);
  const [docForm, setDocForm] = useState(emptyDoc);
  const [newPassword, setNewPassword] = useState("");
  const [tab, setTab] = useState("docs");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const selected = rows.find((h) => h.id === selectedId) || null;

  const load = () =>
    endpoints
      .helpers()
      .then((d) => setRows(d.helpers || []))
      .catch((e) => setError(e.message));

  const loadHelperExtras = async (helperId) => {
    if (!helperId) {
      setDocs([]);
      setHistory([]);
      return;
    }
    const [documents, assignHistory] = await Promise.all([
      endpoints.helperDocuments(helperId).catch(() => ({ documents: [] })),
      endpoints.helperAssignmentHistory(helperId).catch(() => ({ history: [] }))
    ]);
    setDocs(documents.documents || []);
    setHistory(assignHistory.history || assignHistory.assignments || []);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    loadHelperExtras(selectedId).catch((e) => setError(e.message));
  }, [selectedId]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    setError("");
    try {
      const created = await endpoints.createHelper({
        name: form.name,
        mobile: form.mobile,
        email: form.email || undefined,
        address: form.address || undefined,
        password: form.password,
        document_type: form.document_number ? form.document_type : undefined,
        document_number: form.document_number || undefined,
        issue_date: form.issue_date || undefined,
        expiry_date: form.expiry_date || undefined
      });

      if (idFile && created.id) {
        const fd = new FormData();
        fd.append("document_type", form.document_type || "AADHAAR");
        fd.append("document_number", form.document_number || "");
        if (form.issue_date) fd.append("issue_date", form.issue_date);
        if (form.expiry_date) fd.append("expiry_date", form.expiry_date);
        fd.append("file", idFile);
        const existingDocs = await endpoints
          .helperDocuments(created.id)
          .catch(() => ({ documents: [] }));
        const sameType = (existingDocs.documents || []).find(
          (d) =>
            String(d.document_type).toUpperCase() ===
            String(form.document_type || "AADHAAR").toUpperCase()
        );
        if (sameType) {
          await endpoints.updateHelperDocument(sameType.id, fd);
        } else {
          await endpoints.createHelperDocument(created.id, fd);
        }
      }

      setForm(emptyForm);
      setIdFile(null);
      setMsg("Helper created with login + documents");
      await load();
      if (created.id) setSelectedId(created.id);
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

  const uploadDoc = async (e) => {
    e.preventDefault();
    if (!selectedId) return;
    setMsg("");
    setError("");
    try {
      const type =
        docForm.document_type === "OTHER" && docForm.custom_type.trim()
          ? docForm.custom_type.trim().toUpperCase()
          : docForm.document_type;
      const fd = new FormData();
      fd.append("document_type", type);
      fd.append("document_number", docForm.document_number);
      fd.append("issue_date", docForm.issue_date);
      fd.append("expiry_date", docForm.expiry_date);
      if (docForm.file) fd.append("file", docForm.file);
      await endpoints.createHelperDocument(selectedId, fd);
      setDocForm(emptyDoc);
      setMsg(`${type} document uploaded`);
      await loadHelperExtras(selectedId);
    } catch (err) {
      setError(err.message);
    }
  };

  const removeDoc = async (id) => {
    setError("");
    try {
      await endpoints.deactivateHelperDocument(id);
      setMsg("Document deactivated");
      await loadHelperExtras(selectedId);
    } catch (err) {
      setError(err.message);
    }
  };

  const changeHelperPassword = async (e) => {
    e.preventDefault();
    if (!selectedId) return;
    setMsg("");
    setError("");
    try {
      await endpoints.setHelperPassword(selectedId, newPassword);
      setNewPassword("");
      setMsg("Helper password updated");
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
            Personal details, Aadhaar/PAN docs, password, Active/Inactive, and
            assignment history. No verification step.
          </p>
        </div>
      </div>

      <form className="card stack" onSubmit={onSubmit}>
        <h3>Add helper</h3>
        <div className="grid-2">
          {[
            ["name", "Name", "text", true],
            ["mobile", "Registered mobile", "text", true],
            ["email", "Email", "email", false],
            ["address", "Address", "text", false],
            ["document_number", "ID / Aadhaar number", "text", false],
            ["issue_date", "ID issue date", "date", false],
            ["expiry_date", "ID expiry date", "date", false],
            ["password", "Initial password", "password", true]
          ].map(([key, label, type, required]) => (
            <label className="field" key={key}>
              <span>{label}</span>
              <input
                type={type}
                required={required}
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              />
            </label>
          ))}
          <label className="field">
            <span>ID document type</span>
            <select
              value={form.document_type}
              onChange={(e) => setForm({ ...form, document_type: e.target.value })}
            >
              {DOC_TYPES.filter((t) => t !== "OTHER").map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>ID document file (optional)</span>
            <input
              type="file"
              accept=".pdf,image/jpeg,image/png,image/webp"
              onChange={(e) => setIdFile(e.target.files?.[0] || null)}
            />
          </label>
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
                <tr
                  key={h.id}
                  style={{
                    background:
                      selectedId === h.id ? "rgba(142, 203, 255, 0.08)" : undefined
                  }}
                >
                  <td>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => setSelectedId(h.id)}
                    >
                      {h.name}
                    </button>
                  </td>
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
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => {
                          setSelectedId(h.id);
                          setTab("docs");
                        }}
                      >
                        Manage
                      </button>
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
                      {onTrip ? <span className="muted">On trip</span> : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selected ? (
        <div className="card stack">
          <div className="topbar" style={{ marginBottom: 0 }}>
            <div>
              <h3 style={{ margin: 0 }}>
                Manage: {selected.name} (#{selected.id})
              </h3>
              <p className="muted">Mobile {selected.mobile}</p>
            </div>
            <div className="actions" style={{ marginTop: 0 }}>
              <button
                type="button"
                className={`btn ${tab === "docs" ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setTab("docs")}
              >
                Documents
              </button>
              <button
                type="button"
                className={`btn ${tab === "password" ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setTab("password")}
              >
                Password
              </button>
              <button
                type="button"
                className={`btn ${tab === "history" ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setTab("history")}
              >
                Assignment history
              </button>
            </div>
          </div>

          {tab === "docs" ? (
            <>
              <form className="stack" onSubmit={uploadDoc}>
                <h4>Upload Aadhaar / PAN / other document</h4>
                <div className="grid-2">
                  <label className="field">
                    <span>Document type</span>
                    <select
                      value={docForm.document_type}
                      onChange={(e) =>
                        setDocForm({ ...docForm, document_type: e.target.value })
                      }
                    >
                      {DOC_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </label>
                  {docForm.document_type === "OTHER" ? (
                    <label className="field">
                      <span>Custom type name</span>
                      <input
                        required
                        value={docForm.custom_type}
                        onChange={(e) =>
                          setDocForm({ ...docForm, custom_type: e.target.value })
                        }
                        placeholder="e.g. MEDICAL"
                      />
                    </label>
                  ) : null}
                  <label className="field">
                    <span>Document number</span>
                    <input
                      required
                      value={docForm.document_number}
                      onChange={(e) =>
                        setDocForm({ ...docForm, document_number: e.target.value })
                      }
                    />
                  </label>
                  <label className="field">
                    <span>Issue date</span>
                    <input
                      type="date"
                      required
                      value={docForm.issue_date}
                      onChange={(e) =>
                        setDocForm({ ...docForm, issue_date: e.target.value })
                      }
                    />
                  </label>
                  <label className="field">
                    <span>Expiry date</span>
                    <input
                      type="date"
                      required
                      value={docForm.expiry_date}
                      onChange={(e) =>
                        setDocForm({ ...docForm, expiry_date: e.target.value })
                      }
                    />
                  </label>
                  <label className="field">
                    <span>File (PDF / JPG / PNG / WebP)</span>
                    <input
                      type="file"
                      accept=".pdf,image/jpeg,image/png,image/webp"
                      required
                      onChange={(e) =>
                        setDocForm({
                          ...docForm,
                          file: e.target.files?.[0] || null
                        })
                      }
                    />
                  </label>
                </div>
                <button className="btn btn-primary">Upload document</button>
              </form>

              <table className="table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Number</th>
                    <th>Issue</th>
                    <th>Expiry</th>
                    <th>File</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {docs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="muted">
                        No documents yet
                      </td>
                    </tr>
                  ) : (
                    docs.map((d) => (
                      <tr key={d.id}>
                        <td>{d.document_type}</td>
                        <td>{d.document_number || "—"}</td>
                        <td>{String(d.issue_date || "").slice(0, 10) || "—"}</td>
                        <td>{String(d.expiry_date || "").slice(0, 10) || "—"}</td>
                        <td>
                          {d.document_url ? (
                            <a
                              href={endpoints.fileUrl(d.document_url)}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Open
                            </a>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>
                          {Number(d.status) === 1 ? (
                            <button
                              type="button"
                              className="btn btn-ghost"
                              onClick={() => removeDoc(d.id)}
                            >
                              Deactivate
                            </button>
                          ) : (
                            <span className="badge badge-muted">Inactive</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </>
          ) : null}

          {tab === "password" ? (
            <form className="stack" onSubmit={changeHelperPassword}>
              <h4>Set / change helper password</h4>
              <p className="muted">
                Initial password on create. Admin can update here. Helper can also use
                `/api/password/change` after login.
              </p>
              <label className="field">
                <span>New password</span>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </label>
              <button className="btn btn-primary" disabled={!selected.user_id}>
                Update helper password
              </button>
              {!selected.user_id ? (
                <p className="error">No login user linked to this helper</p>
              ) : null}
            </form>
          ) : null}

          {tab === "history" ? (
            <>
              <h4>Historical vehicle assignments</h4>
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Vehicle</th>
                    <th>Role</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Active</th>
                  </tr>
                </thead>
                <tbody>
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="muted">
                        No assignment history
                      </td>
                    </tr>
                  ) : (
                    history.map((row) => (
                      <tr key={row.id}>
                        <td>{row.id}</td>
                        <td>#{row.vehicle_id}</td>
                        <td>{row.assignment_role || "HELPER"}</td>
                        <td>{String(row.start_date || "").slice(0, 10)}</td>
                        <td>{String(row.end_date || "").slice(0, 10) || "—"}</td>
                        <td>
                          <span
                            className={
                              Number(row.is_active) === 1
                                ? "badge badge-ok"
                                : "badge badge-muted"
                            }
                          >
                            {Number(row.is_active) === 1 ? "Active" : "Closed"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </>
          ) : null}
        </div>
      ) : null}

      {msg ? <p className="ok">{msg}</p> : null}
      {error ? <p className="error">{error}</p> : null}
    </div>
  );
}
