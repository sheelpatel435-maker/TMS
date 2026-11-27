import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { endpoints } from "../../api";

export default function FieldTrips() {
  const [scope, setScope] = useState("current");
  const [trips, setTrips] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError("");
    endpoints
      .mobileTrips(scope)
      .then((data) => setTrips(data.trips || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [scope]);

  return (
    <div className="stack">
      <div className="topbar" style={{ alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>My trips</h2>
        <select value={scope} onChange={(e) => setScope(e.target.value)}>
          <option value="current">Current</option>
          <option value="history">History</option>
          <option value="all">All</option>
        </select>
      </div>

      {error ? <p className="error">{error}</p> : null}
      {loading ? <p className="muted">Loading…</p> : null}

      {!loading && !trips.length ? (
        <p className="muted">No trips assigned yet</p>
      ) : null}

      <div className="stack">
        {trips.map((t) => (
          <Link key={t.id} className="card mobile-trip-card" to={`/field/trips/${t.id}`}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
              <strong>
                {t.source || "?"} → {t.destination || "?"}
              </strong>
              <span className="badge">{t.status}</span>
            </div>
            <p className="muted" style={{ margin: "0.35rem 0 0" }}>
              Trip #{t.id}
              {t.start_date ? ` · ${String(t.start_date).slice(0, 10)}` : ""}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
