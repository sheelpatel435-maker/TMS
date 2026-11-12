import { useEffect, useMemo, useState } from "react";
import { endpoints } from "../api";

const DOC_TYPES = ["RC", "INSURANCE", "FITNESS", "PERMIT", "PUC", "ROAD_TAX"];

const emptyVehicle = {
  registration_no: "",
  vehicle_type_id: "",
  make: "",
  model: "",
  capacity: "",
  ownership: "OWNED",
  status: "1"
};

const emptyDoc = {
  document_type: "RC",
  document_number: "",
  issue_date: "",
  expiry_date: "",
  file: null
};

const emptyAssign = {
  vehicle_id: "",
  driver_id: "",
  helper_id: "",
  start_date: new Date().toISOString().slice(0, 10),
  end_date: "",
  is_active: 1
};

const statusLabel = (s) =>
  ({ 0: "Inactive", 1: "Active / Available", 2: "Maintenance" }[Number(s)] || s);

export default function Vehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [types, setTypes] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [helpers, setHelpers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [expiring, setExpiring] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [docs, setDocs] = useState([]);
  const [history, setHistory] = useState([]);
  const [customTypes, setCustomTypes] = useState([]);
  const [newTypeName, setNewTypeName] = useState("");
  const [vehicleForm, setVehicleForm] = useState(emptyVehicle);
  const [typeName, setTypeName] = useState("");
  const [docForm, setDocForm] = useState(emptyDoc);
  const [assignForm, setAssignForm] = useState(emptyAssign);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [tab, setTab] = useState("docs");

  const selected = useMemo(
    () => vehicles.find((v) => String(v.id) === String(selectedId)),
    [vehicles, selectedId]
  );

  const loadCore = async () => {
    const [v, t, d, h, a, e, dt] = await Promise.all([
      endpoints.vehicles(),
      endpoints.vehicleTypes().catch(() => ({ vehicleTypes: [] })),
      endpoints.drivers().catch(() => ({ drivers: [] })),
      endpoints.helpers().catch(() => ({ helpers: [] })),
      endpoints.assignments().catch(() => ({ assignments: [] })),
      endpoints.expiringDocuments().catch(() => ({ documents: [] })),
      endpoints.vehicleDocumentTypes().catch(() => ({ documentTypes: [] }))
    ]);
    setVehicles(v.vehicles || []);
    setTypes(t.vehicleTypes || []);
    setDrivers(d.drivers || []);
    setHelpers(h.helpers || []);
    setAssignments(a.assignments || []);
    setExpiring(e.documents || e.rows || []);
    setCustomTypes(dt.documentTypes || []);
  };

  const loadSelected = async (id) => {
    if (!id) {
      setDocs([]);
      setHistory([]);
      return;
    }
    const [documents, tripHistory] = await Promise.all([
      endpoints.vehicleDocuments(id),
      endpoints.vehicleTripHistory(id).catch(() => ({ tripAssignmentHistory: [] }))
    ]);
    setDocs(documents.documents || []);
    setHistory(tripHistory.tripAssignmentHistory || []);
  };

  useEffect(() => {
    loadCore().catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    loadSelected(selectedId).catch((e) => setError(e.message));
  }, [selectedId]);

  const createType = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await endpoints.createVehicleType({ name: typeName, status: 1 });
      setTypeName("");
      setMsg("Vehicle type created");
      await loadCore();
    } catch (err) {
      setError(err.message);
    }
  };

  const createVehicle = async (e) => {
    e.preventDefault();
    setError("");
    setMsg("");
    try {
      await endpoints.createVehicle({
        ...vehicleForm,
        vehicle_type_id: Number(vehicleForm.vehicle_type_id),
        capacity:
          vehicleForm.capacity === "" ? null : Number(vehicleForm.capacity),
        status: Number(vehicleForm.status)
      });
      setVehicleForm(emptyVehicle);
      setMsg("Vehicle created");
      await loadCore();
    } catch (err) {
      setError(err.message);
    }
  };

  const uploadDoc = async (e) => {
    e.preventDefault();
    if (!selectedId) return setError("Select a vehicle first");
    if (!docForm.file) return setError("Choose a PDF/JPG/PNG file to upload");
    setError("");
    setMsg("");
    try {
      const fd = new FormData();
      fd.append("document_type", docForm.document_type);
      fd.append("document_number", docForm.document_number);
      fd.append("issue_date", docForm.issue_date);
      fd.append("expiry_date", docForm.expiry_date);
      fd.append("file", docForm.file);
      await endpoints.createVehicleDocument(selectedId, fd);
      setDocForm(emptyDoc);
      setMsg("Document uploaded (verification PENDING)");
      await loadSelected(selectedId);
      await loadCore();
    } catch (err) {
      setError(err.message);
    }
  };

  const verifyDoc = async (id, verification_status) => {
    try {
      await endpoints.verifyVehicleDocument(id, { verification_status });
      setMsg(`Document marked ${verification_status}`);
      await loadSelected(selectedId);
    } catch (err) {
      setError(err.message);
    }
  };

  const createAssignment = async (e) => {
    e.preventDefault();
    setError("");
    setMsg("");
    try {
      await endpoints.createAssignment({
        vehicle_id: Number(assignForm.vehicle_id || selectedId),
        driver_id: assignForm.driver_id ? Number(assignForm.driver_id) : null,
        helper_id: assignForm.helper_id ? Number(assignForm.helper_id) : null,
        start_date: assignForm.start_date,
        end_date: assignForm.end_date || null,
        is_active: 1
      });
      setAssignForm({ ...emptyAssign, vehicle_id: selectedId });
      setMsg("Assignment created (one active driver/helper enforced by API)");
      await loadCore();
    } catch (err) {
      setError(err.message);
    }
  };

  const addCustomDocType = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await endpoints.createVehicleDocumentType({ name: newTypeName.trim().toUpperCase() });
      setNewTypeName("");
      setMsg("Custom document type added");
      await loadCore();
    } catch (err) {
      setError(err.message);
    }
  };

  const allDocTypes = [
    ...DOC_TYPES,
    ...customTypes.map((t) => t.name || t.document_type).filter(Boolean)
  ].filter((v, i, arr) => arr.indexOf(v) === i);

  const activeForSelected = assignments.filter(
    (a) =>
      String(a.vehicle_id) === String(selectedId) && Number(a.is_active) === 1
  );

  return (
    <div>
      <div className="topbar">
        <div>
          <h1 style={{ margin: 0 }}>Vehicle Management</h1>
          <p className="muted">
            Registration, documents (RC/Insurance/Fitness/Permit/PUC + upload),
            assignments, expiry alerts, trip history.
          </p>
        </div>
      </div>

      {expiring.length ? (
        <div className="card">
          <h3>Expiry alerts</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Number</th>
                <th>Expiry</th>
                <th>Entity</th>
              </tr>
            </thead>
            <tbody>
              {expiring.slice(0, 15).map((d, idx) => (
                <tr key={d.id || idx}>
                  <td>{d.document_type}</td>
                  <td>{d.document_number || "—"}</td>
                  <td>{String(d.expiry_date || "").slice(0, 10)}</td>
                  <td>
                    {d.source || "vehicle"} #{d.owner_id || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <form className="card stack" onSubmit={createType}>
        <h3>Vehicle type</h3>
        <div className="grid-2">
          <label className="field">
            <span>Type name (Truck / Trailer…)</span>
            <input value={typeName} onChange={(e) => setTypeName(e.target.value)} required />
          </label>
        </div>
        <button className="btn btn-primary">Add type</button>
      </form>

      <form className="card stack" onSubmit={createVehicle}>
        <h3>Add vehicle</h3>
        <div className="grid-2">
          <label className="field">
            <span>Registration number</span>
            <input
              required
              value={vehicleForm.registration_no}
              onChange={(e) =>
                setVehicleForm({ ...vehicleForm, registration_no: e.target.value })
              }
            />
          </label>
          <label className="field">
            <span>Type</span>
            <select
              required
              value={vehicleForm.vehicle_type_id}
              onChange={(e) =>
                setVehicleForm({ ...vehicleForm, vehicle_type_id: e.target.value })
              }
            >
              <option value="">Select type</option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Make</span>
            <input
              required
              value={vehicleForm.make}
              onChange={(e) => setVehicleForm({ ...vehicleForm, make: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Model</span>
            <input
              required
              value={vehicleForm.model}
              onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Capacity</span>
            <input
              type="number"
              min="0"
              value={vehicleForm.capacity}
              onChange={(e) =>
                setVehicleForm({ ...vehicleForm, capacity: e.target.value })
              }
            />
          </label>
          <label className="field">
            <span>Ownership</span>
            <select
              required
              value={vehicleForm.ownership}
              onChange={(e) =>
                setVehicleForm({ ...vehicleForm, ownership: e.target.value })
              }
            >
              <option value="OWNED">OWNED</option>
              <option value="LEASED">LEASED</option>
              <option value="HIRED">HIRED</option>
            </select>
          </label>
          <label className="field">
            <span>Availability status</span>
            <select
              value={vehicleForm.status}
              onChange={(e) =>
                setVehicleForm({ ...vehicleForm, status: e.target.value })
              }
            >
              <option value="1">Active / Available</option>
              <option value="2">Maintenance</option>
              <option value="0">Inactive</option>
            </select>
          </label>
        </div>
        <button className="btn btn-primary">Create vehicle</button>
      </form>

      <div className="card">
        <h3>Fleet</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Reg. no</th>
              <th>Make / Model</th>
              <th>Capacity</th>
              <th>Ownership</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((v) => (
              <tr key={v.id}>
                <td>{v.registration_no}</td>
                <td>
                  {v.make} {v.model}
                </td>
                <td>{v.capacity ?? "—"}</td>
                <td>{v.ownership || "—"}</td>
                <td>
                  <span className="badge">{statusLabel(v.status)}</span>
                </td>
                <td>
                  <button
                    className="btn btn-ghost"
                    type="button"
                    onClick={() => {
                      setSelectedId(String(v.id));
                      setAssignForm((f) => ({ ...f, vehicle_id: String(v.id) }));
                      setTab("docs");
                    }}
                  >
                    Manage
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected ? (
        <div className="card stack">
          <h3>
            Manage {selected.registration_no}{" "}
            <span className="badge">{statusLabel(selected.status)}</span>
          </h3>
          <div className="actions">
            <button
              type="button"
              className={`btn ${tab === "docs" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setTab("docs")}
            >
              Documents
            </button>
            <button
              type="button"
              className={`btn ${tab === "assign" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setTab("assign")}
            >
              Assignments
            </button>
            <button
              type="button"
              className={`btn ${tab === "history" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setTab("history")}
            >
              Trip history
            </button>
          </div>

          {tab === "docs" ? (
            <>
              <form className="stack" onSubmit={addCustomDocType}>
                <h4>Configurable document type</h4>
                <div className="grid-2">
                  <label className="field">
                    <span>New type name</span>
                    <input
                      value={newTypeName}
                      onChange={(e) => setNewTypeName(e.target.value)}
                      placeholder="e.g. FITNESS_CERT"
                    />
                  </label>
                </div>
                <button className="btn btn-ghost">Add type</button>
              </form>

              <form className="stack" onSubmit={uploadDoc}>
                <h4>Upload document (file attachment)</h4>
                <div className="grid-2">
                  <label className="field">
                    <span>Document type</span>
                    <select
                      value={docForm.document_type}
                      onChange={(e) =>
                        setDocForm({ ...docForm, document_type: e.target.value })
                      }
                    >
                      {allDocTypes.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </label>
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
                    <span>File (PDF / JPG / PNG / WebP, max 8MB)</span>
                    <input
                      type="file"
                      accept=".pdf,image/jpeg,image/png,image/webp"
                      required
                      onChange={(e) =>
                        setDocForm({ ...docForm, file: e.target.files?.[0] || null })
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
                    <th>Verification</th>
                    <th>File</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {docs.map((d) => (
                    <tr key={d.id}>
                      <td>{d.document_type}</td>
                      <td>{d.document_number}</td>
                      <td>{String(d.issue_date || "").slice(0, 10)}</td>
                      <td>{String(d.expiry_date || "").slice(0, 10)}</td>
                      <td>
                        <span className="badge">{d.verification_status || "PENDING"}</span>
                      </td>
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
                      <td className="actions">
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => verifyDoc(d.id, "VERIFIED")}
                        >
                          Verify
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => verifyDoc(d.id, "REJECTED")}
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : null}

          {tab === "assign" ? (
            <>
              <p className="muted">
                One active driver and one active helper per vehicle (overlap blocked by API).
              </p>
              <div className="card" style={{ margin: 0 }}>
                <h4>Active now</h4>
                {activeForSelected.length === 0 ? (
                  <p className="muted">No active assignment</p>
                ) : (
                  <ul>
                    {activeForSelected.map((a) => (
                      <li key={a.id}>
                        Driver #{a.driver_id || "—"} / Helper #{a.helper_id || "—"} from{" "}
                        {String(a.start_date || "").slice(0, 10)}
                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{ marginLeft: 8 }}
                          onClick={() =>
                            endpoints
                              .closeAssignment(a.id)
                              .then(() => loadCore())
                              .then(() => setMsg("Assignment closed (history retained)"))
                              .catch((err) => setError(err.message))
                          }
                        >
                          Close
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <form className="stack" onSubmit={createAssignment}>
                <h4>New assignment</h4>
                <div className="grid-2">
                  <label className="field">
                    <span>Driver</span>
                    <select
                      value={assignForm.driver_id}
                      onChange={(e) =>
                        setAssignForm({ ...assignForm, driver_id: e.target.value })
                      }
                    >
                      <option value="">Optional</option>
                      {drivers.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Helper</span>
                    <select
                      value={assignForm.helper_id}
                      onChange={(e) =>
                        setAssignForm({ ...assignForm, helper_id: e.target.value })
                      }
                    >
                      <option value="">Optional</option>
                      {helpers.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Start date</span>
                    <input
                      type="date"
                      required
                      value={assignForm.start_date}
                      onChange={(e) =>
                        setAssignForm({ ...assignForm, start_date: e.target.value })
                      }
                    />
                  </label>
                  <label className="field">
                    <span>End date (optional)</span>
                    <input
                      type="date"
                      value={assignForm.end_date}
                      onChange={(e) =>
                        setAssignForm({ ...assignForm, end_date: e.target.value })
                      }
                    />
                  </label>
                </div>
                <button className="btn btn-primary">Assign</button>
              </form>
            </>
          ) : null}

          {tab === "history" ? (
            <>
              <p className="muted">
                Completed-trip assignment history is retained even after reassignment.
              </p>
              <table className="table">
                <thead>
                  <tr>
                    <th>Trip</th>
                    <th>Driver</th>
                    <th>Helper</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="muted">
                        No completed trip history yet
                      </td>
                    </tr>
                  ) : (
                    history.map((h) => (
                      <tr key={h.id}>
                        <td>#{h.trip_id}</td>
                        <td>{h.driver_id || "—"}</td>
                        <td>{h.helper_id || "—"}</td>
                        <td>{String(h.trip_start_date || "").slice(0, 10) || "—"}</td>
                        <td>{String(h.trip_end_date || "").slice(0, 10) || "—"}</td>
                        <td>{String(h.completed_at || "").slice(0, 19) || "—"}</td>
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
