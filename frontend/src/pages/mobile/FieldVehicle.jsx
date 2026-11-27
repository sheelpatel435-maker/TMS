import { useEffect, useState } from "react";
import { endpoints } from "../../api";

export default function FieldVehicle() {
  const [vehicle, setVehicle] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      endpoints.mobileVehicle(),
      endpoints.mobileVehicleDocuments().catch(() => ({ documents: [] }))
    ])
      .then(([v, d]) => {
        setVehicle(v.vehicle || null);
        setDocuments(d.documents || []);
      })
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="error">{error}</p>;

  return (
    <div className="stack">
      <h2 style={{ margin: 0 }}>My vehicle</h2>
      {!vehicle ? (
        <p className="muted">No active vehicle assignment</p>
      ) : (
        <div className="card stack">
          <strong>{vehicle.registration_no}</strong>
          <span className="muted">
            {[vehicle.make, vehicle.model].filter(Boolean).join(" ") || "—"}
          </span>
          {vehicle.capacity != null ? (
            <span className="muted">Capacity: {vehicle.capacity}</span>
          ) : null}
        </div>
      )}

      <div className="card stack">
        <h3 style={{ margin: 0 }}>Vehicle documents</h3>
        {documents.length ? (
          <ul className="mobile-list">
            {documents.map((d) => (
              <li key={d.id}>
                <strong>{d.document_type}</strong>
                {d.expiry_date ? (
                  <span className="muted"> exp {String(d.expiry_date).slice(0, 10)}</span>
                ) : null}
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
    </div>
  );
}
