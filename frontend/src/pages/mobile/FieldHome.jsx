import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { endpoints } from "../../api";

export default function FieldHome() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    endpoints
      .mobileMe()
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!data) return <p className="muted">Loading profile…</p>;

  const { profile, documents, assigned_vehicle: vehicle } = data;

  return (
    <div className="stack">
      <div className="card stack">
        <h2 style={{ margin: 0 }}>My profile</h2>
        <p style={{ margin: 0 }}>
          <strong>{profile?.name}</strong>
          <br />
          <span className="muted">{profile?.mobile}</span>
        </p>
        <span className="badge">{profile?.user_type}</span>
      </div>

      <div className="card stack">
        <h3 style={{ margin: 0 }}>Assigned vehicle</h3>
        {vehicle ? (
          <>
            <p style={{ margin: 0 }}>
              <strong>{vehicle.registration_no}</strong>
              <br />
              <span className="muted">
                {[vehicle.make, vehicle.model].filter(Boolean).join(" ") || "—"}
              </span>
            </p>
            <Link className="btn btn-ghost" to="/field/vehicle">
              Vehicle & documents
            </Link>
          </>
        ) : (
          <p className="muted">No active vehicle assignment</p>
        )}
      </div>

      <div className="card stack">
        <h3 style={{ margin: 0 }}>My documents</h3>
        {documents?.length ? (
          <ul className="mobile-list">
            {documents.map((d) => (
              <li key={d.id}>
                <strong>{d.document_type}</strong>
                <span className="muted"> {d.document_number || ""}</span>
                {d.document_url ? (
                  <>
                    {" "}
                    <a href={endpoints.fileUrl(d.document_url)} target="_blank" rel="noreferrer">
                      Open
                    </a>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No documents</p>
        )}
      </div>

      <Link className="btn btn-primary" to="/field/trips">
        My trips
      </Link>
    </div>
  );
}
