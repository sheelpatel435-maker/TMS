import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { endpoints } from "../../api";
import { useAuth } from "../../auth";

export default function FieldTripDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [trip, setTrip] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    endpoints
      .mobileTrip(id)
      .then((data) => setTrip(data.trip))
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) return <p className="error">{error}</p>;
  if (!trip) return <p className="muted">Loading trip…</p>;

  const docs = trip.trip_documents || [];
  const bilties = trip.bilties || trip.bilty_summaries || [];
  const settlements = trip.settlements || [];

  return (
    <div className="stack">
      <Link className="muted" to="/field/trips">
        ← Trips
      </Link>

      <div className="card stack">
        <h2 style={{ margin: 0 }}>
          {trip.source} → {trip.destination}
        </h2>
        <span className="badge">{trip.status}</span>
        <p className="muted" style={{ margin: 0 }}>
          Trip #{trip.id}
          {trip.start_date ? ` · ${String(trip.start_date).slice(0, 10)}` : ""}
        </p>
      </div>

      <div className="card stack">
        <h3 style={{ margin: 0 }}>Bilty</h3>
        {bilties.length ? (
          <ul className="mobile-list">
            {bilties.map((b) => (
              <li key={b.bilty_id || b.id}>
                <strong>{b.bilty_number || b.bilty_id}</strong>
                <span className="muted">
                  {" "}
                  {b.consignor || ""} → {b.consignee || ""}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No bilty linked</p>
        )}
      </div>

      <div className="card stack">
        <h3 style={{ margin: 0 }}>Trip documents</h3>
        {docs.length ? (
          <ul className="mobile-list">
            {docs.map((d) => (
              <li key={d.id}>
                {d.document_type}{" "}
                <a href={endpoints.fileUrl(d.document_url)} target="_blank" rel="noreferrer">
                  Open
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No trip documents</p>
        )}
      </div>

      {user?.user_type === "DRIVER" ? (
        <>
          <div className="card stack">
            <h3 style={{ margin: 0 }}>Settlement</h3>
            {settlements.length ? (
              <ul className="mobile-list">
                {settlements.map((s) => (
                  <li key={s.id}>
                    <span className="badge">{s.status}</span> balance{" "}
                    {s.balance_amount ?? "—"} (adv {s.total_advance ?? "—"} − exp{" "}
                    {s.total_expenses ?? "—"})
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">No settlement yet</p>
            )}
          </div>
          <Link className="btn btn-primary" to={`/field/expenses?trip_id=${trip.id}`}>
            Submit / view expenses
          </Link>
        </>
      ) : null}
    </div>
  );
}
