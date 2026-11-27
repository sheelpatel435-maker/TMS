import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { endpoints } from "../../api";
import { useAuth } from "../../auth";

export default function FieldExpenses() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const tripFromQuery = params.get("trip_id") || "";

  const [types, setTypes] = useState([]);
  const [trips, setTrips] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [tripId, setTripId] = useState(tripFromQuery);
  const [expenseType, setExpenseType] = useState("");
  const [amount, setAmount] = useState("");
  const [remarks, setRemarks] = useState("");
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isDriver = user?.user_type === "DRIVER";

  const load = async () => {
    const [t, tripData, exp] = await Promise.all([
      endpoints.mobileExpenseTypes(),
      endpoints.mobileTrips("current"),
      endpoints.mobileExpenses(tripFromQuery || undefined)
    ]);
    setTypes(t.expenseTypes || []);
    setTrips(tripData.trips || []);
    setExpenses(exp.expenses || []);
    if (!expenseType && t.expenseTypes?.[0]?.code) {
      setExpenseType(t.expenseTypes[0].code);
    }
  };

  useEffect(() => {
    if (!isDriver) return;
    load().catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDriver, tripFromQuery]);

  const tripOptions = useMemo(() => trips, [trips]);

  if (!isDriver) {
    return <p className="muted">Helpers cannot submit expenses.</p>;
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    setError("");
    if (!tripId || !expenseType || !amount || !file) {
      setError("Trip, type, amount and receipt photo are required");
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("trip_id", tripId);
      fd.append("expense_type", expenseType);
      fd.append("requested_amount", amount);
      if (remarks) fd.append("remarks", remarks);
      fd.append("file", file);
      await endpoints.mobileSubmitExpense(fd);
      setMsg("Expense submitted for approval");
      setAmount("");
      setRemarks("");
      setFile(null);
      const exp = await endpoints.mobileExpenses(tripId || undefined);
      setExpenses(exp.expenses || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="stack">
      <h2 style={{ margin: 0 }}>Expenses</h2>

      <form className="card stack" onSubmit={onSubmit}>
        <label className="field">
          <span>Trip</span>
          <select value={tripId} onChange={(e) => setTripId(e.target.value)} required>
            <option value="">Select trip</option>
            {tripOptions.map((t) => (
              <option key={t.id} value={t.id}>
                #{t.id} {t.source} → {t.destination} ({t.status})
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Expense type</span>
          <select
            value={expenseType}
            onChange={(e) => setExpenseType(e.target.value)}
            required
          >
            <option value="">Select type</option>
            {types.map((t) => (
              <option key={t.code || t.id} value={t.code}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Amount</span>
          <input
            type="number"
            min="1"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>Remarks</span>
          <input value={remarks} onChange={(e) => setRemarks(e.target.value)} />
        </label>
        <label className="field">
          <span>Receipt photo *</span>
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            required
          />
        </label>
        {error ? <p className="error">{error}</p> : null}
        {msg ? <p className="ok">{msg}</p> : null}
        <button className="btn btn-primary" disabled={loading}>
          {loading ? "Submitting…" : "Submit expense"}
        </button>
      </form>

      <div className="card stack">
        <h3 style={{ margin: 0 }}>My expense status</h3>
        {!expenses.length ? <p className="muted">No expenses yet</p> : null}
        <ul className="mobile-list">
          {expenses.map((ex) => (
            <li key={ex.id}>
              <span className="badge">{ex.status}</span> {ex.expense_type} · ₹
              {ex.requested_amount}
              {ex.trip_id ? ` · trip #${ex.trip_id}` : ""}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
