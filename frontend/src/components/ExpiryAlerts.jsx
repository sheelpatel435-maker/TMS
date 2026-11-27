import { useEffect, useState } from "react";
import { endpoints } from "../api";

/**
 * Document expiry alerts for vehicle / driver / helper docs.
 * @param {{ source?: "vehicle"|"driver"|"helper"|null, limit?: number, days?: number }} props
 */
export default function ExpiryAlerts({ source = null, limit = 15, days = 30 }) {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    endpoints
      .expiringDocuments(days)
      .then((data) => {
        if (!alive) return;
        let list = data.documents || [];
        if (source) {
          list = list.filter(
            (d) => String(d.source || "").toLowerCase() === source
          );
        }
        setRows(list);
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [source, days]);

  if (error) {
    return <p className="error">Expiry alerts: {error}</p>;
  }

  if (!rows.length) {
    return null;
  }

  return (
    <div className="card">
      <h3>Expiry alerts ({days} days)</h3>
      <p className="muted">
        Documents expiring soon or already expired
        {source ? ` for ${source}s` : ""}.
      </p>
      <table className="table">
        <thead>
          <tr>
            <th>Source</th>
            <th>Type</th>
            <th>Number</th>
            <th>Expiry</th>
            <th>Entity</th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, limit).map((d, idx) => (
            <tr key={`${d.source}-${d.id || idx}`}>
              <td>
                <span className="badge badge-warn">
                  {d.source || "document"}
                </span>
              </td>
              <td>{d.document_type}</td>
              <td>{d.document_number || "—"}</td>
              <td>{String(d.expiry_date || "").slice(0, 10)}</td>
              <td>
                {d.source || "entity"} #{d.owner_id || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
