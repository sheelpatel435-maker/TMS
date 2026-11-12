import { useEffect, useState } from "react";
import { endpoints } from "../api";
import { useAuth } from "../auth";

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    endpoints
      .dashboard()
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  const counts = data?.counts || data || {};

  return (
    <div>
      <div className="topbar">
        <div>
          <h1 style={{ margin: 0 }}>Dashboard</h1>
          <p className="muted">Welcome, {user?.name}. Company-scoped operations.</p>
        </div>
      </div>
      {error ? <p className="error">{error}</p> : null}
      <div className="grid-3">
        {["vehicles", "drivers", "helpers", "trips", "bilties", "clients", "invoices"].map(
          (key) => (
            <div className="card" key={key}>
              <div className="muted">{key}</div>
              <h2 style={{ margin: "0.35rem 0 0" }}>
                {counts[key] ?? counts[`${key}_count`] ?? "—"}
              </h2>
            </div>
          )
        )}
      </div>
    </div>
  );
}
