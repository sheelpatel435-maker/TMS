import { useEffect, useState } from "react";
import { endpoints } from "../api";

const emptyForm = {
  name: "",
  mobile: "",
  email: "",
  address: "",
  license_number: "",
  license_issue_date: "",
  license_expiry_date: "",
  password: ""
};

const emptyDoc = {
  document_type: "LICENSE",
  document_number: "",
  issue_date: "",
  expiry_date: "",
  custom_type: "",
  file: null
};

const DOC_TYPES = ["LICENSE", "AADHAAR", "PAN", "PHOTO", "OTHER"];

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

export default function Drivers() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [licenseFile, setLicenseFile] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [docs, setDocs] = useState([]);
  const [history, setHistory] = useState([]);
  const [docForm, setDocForm] = useState(emptyDoc);
  const [newPassword, setNewPassword] = useState("");
  const [tab, setTab] = useState("docs");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const selected = rows.find((d) => d.id === selectedId) || null;

  const load = () =>
    endpoints
      .drivers()
      .then((d) => setRows(d.drivers || []))
      .catch((e) => setError(e.message));

  const loadDriverExtras = async (driverId) => {
    if (!driverId) {
      setDocs([]);
      setHistory([]);
      return;
    }
    const [documents, assignHistory] = await Promise.all([
      endpoints.driverDocuments(driverId).catch(() => ({ documents: [] })),
      endpoints.driverAssignmentHistory(driverId).catch(() => ({ history: [] }))
    ]);
    setDocs(documents.documents || []);
    setHistory(assignHistory.history || assignHistory.assignments || []);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    loadDriverExtras(selectedId).catch((e) => setError(e.message));
  }, [selectedId]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    setError("");
    try {
      const created = await endpoints.createDriver({
        name: form.name,
        mobile: form.mobile,
        email: form.email || undefined,
        address: form.address || undefined,
        license_number: form.license_number || undefined,
        license_issue_date: form.license_issue_date || undefined,
        license_expiry_date: form.license_expiry_date || undefined,
        password: form.password
      });

      if (licenseFile && created.id) {
        const fd = new FormData();
        fd.append("document_type", "LICENSE");
        fd.append("document_number", form.license_number || "");
        if (form.license_issue_date) fd.append("issue_date", form.license_issue_date);
        if (form.license_expiry_date) {
          fd.append("expiry_date", form.license_expiry_date);
        }
        fd.append("file", licenseFile);
        // If LICENSE already created from number, this adds/updates with file.
        // Prefer update path if a LICENSE row exists after create.
        const existingDocs = await endpoints
          .driverDocuments(created.id)
          .catch(() => ({ documents: [] }));
        const licenseDoc = (existingDocs.documents || []).find(
          (d) => String(d.document_type).toUpperCase() === "LICENSE"
        );
        if (licenseDoc) {
          await endpoints.updateDriverDocument(licenseDoc.id, fd);
        } else {
          await endpoints.createDriverDocument(created.id, fd);
        }
      }

      setForm(emptyForm);
      setLicenseFile(null);
      setMsg("Driver created with login + DL details");
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
      await endpoints.setDriverDuty(id, duty);
      setMsg(duty === "ACTIVE" ? "Driver marked Active" : "Driver marked Inactive");
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
      await endpoints.createDriverDocument(selectedId, fd);
      setDocForm(emptyDoc);
      setMsg(`${type} document uploaded`);
      await loadDriverExtras(selectedId);
    } catch (err) {
      setError(err.message);
    }
  };

  const removeDoc = async (id) => {
    setError("");
    try {
      await endpoints.deactivateDriverDocument(id);
      setMsg("Document deactivated");
      await loadDriverExtras(selectedId);
    } catch (err) {
      setError(err.message);
    }
  };

  const changeDriverPassword = async (e) => {
    e.preventDefault();
    if (!selectedId) return;
    setMsg("");
    setError("");
    try {
      await endpoints.setDriverPassword(selectedId, newPassword);
      setNewPassword("");
      setMsg("Driver password updated");
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
            Personal details, DL/Aadhaar/PAN docs, password, Active/Inactive, and
            assignment history. No verification step.
          </p>
        </div>
      </div>

      <form className="card stack" onSubmit={onSubmit}>
        <h3>Add driver</h3>
        <div className="grid-2">
          {[
            ["name", "Name", "text", true],
            ["mobile", "Registered mobile", "text", true],
            ["email", "Email", "email", false],
            ["address", "Address", "text", false],
            ["license_number", "DL number", "text", false],
            ["license_issue_date", "DL issue date", "date", false],
            ["license_expiry_date", "DL expiry date", "date", false],
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
            <span>DL document file (optional)</span>
            <input
              type="file"
              accept=".pdf,image/jpeg,image/png,image/webp"
              onChange={(e) => setLicenseFile(e.target.files?.[0] || null)}
            />
          </label>
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
              <th>Availability</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => {
              const active = Number(d.status) === 1;
              const availability = availabilityLabel(d);
              const onTrip = availability === "ON_TRIP";
              const busy = busyId === d.id;
              return (
                <tr
                  key={d.id}
                  style={{
                    background:
                      selectedId === d.id ? "rgba(142, 203, 255, 0.08)" : undefined
                  }}
                >
                  <td>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => setSelectedId(d.id)}
                    >
                      {d.name}
                    </button>
                  </td>
                  <td>{d.mobile}</td>
                  <td>{d.user_id || "—"}</td>
                  <td>
                    <span className={active ? "badge badge-ok" : "badge badge-muted"}>
                      {statusLabel(d)}
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
                          setSelectedId(d.id);
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
                          onClick={() => setDuty(d.id, "ACTIVE")}
                        >
                          Activate
                        </button>
                      ) : null}
                      {active && !onTrip ? (
                        <button
                          type="button"
                          className="btn"
                          disabled={busy}
                          onClick={() => setDuty(d.id, "INACTIVE")}
                        >
                          Deactivate
                        </button>
                      ) : null}
                      {onTrip ? (
                        <span className="muted">On trip</span>
                      ) : null}
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
                <h4>Upload DL / Aadhaar / PAN / other document</h4>
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
            <form className="stack" onSubmit={changeDriverPassword}>
              <h4>Set / change driver password</h4>
              <p className="muted">
                Initial password is set on create. Admin can update it here. Driver can
                also change their own password after login via `/api/password/change`.
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
                Update driver password
              </button>
              {!selected.user_id ? (
                <p className="error">No login user linked to this driver</p>
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
                    history.map((h) => (
                      <tr key={h.id}>
                        <td>{h.id}</td>
                        <td>#{h.vehicle_id}</td>
                        <td>{h.assignment_role || "DRIVER"}</td>
                        <td>{String(h.start_date || "").slice(0, 10)}</td>
                        <td>{String(h.end_date || "").slice(0, 10) || "—"}</td>
                        <td>
                          <span
                            className={
                              Number(h.is_active) === 1
                                ? "badge badge-ok"
                                : "badge badge-muted"
                            }
                          >
                            {Number(h.is_active) === 1 ? "Active" : "Closed"}
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
