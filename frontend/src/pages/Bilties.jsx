import { useEffect, useState } from "react";
import { endpoints } from "../api";

const empty = {
  id: null,
  bilty_number: "",
  company_id: "",
  client_id: "",
  consignor: "",
  consignee: "",
  pickup_location: "",
  drop_location: "",
  goods_description: "",
  weight_kg: "",
  packages: "",
  status: "RESERVED",
  bilty_date: ""
};

export default function Bilties() {
  const [rows, setRows] = useState([]);
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState(empty);
  const [rangeCount, setRangeCount] = useState(10);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [preparing, setPreparing] = useState(false);

  const load = async () => {
    const [bilties, clientData] = await Promise.all([
      endpoints.bilties(),
      endpoints.clients().catch(() => ({ clients: [] }))
    ]);
    setRows(bilties.bilties || []);
    setClients(clientData.clients || []);
  };

  /** Form khulte hi number auto — prepare-form / reserve */
  const openNewForm = async () => {
    setMsg("");
    setError("");
    setPreparing(true);
    try {
      const data = await endpoints.prepareBiltyForm({});
      const f = data.form || data;
      setForm({
        ...empty,
        id: f.id || data.id,
        bilty_number: f.bilty_number || data.bilty_number,
        company_id: f.company_id || data.company_id || "",
        status: f.status || "RESERVED",
        bilty_date: (f.bilty_date || data.bilty_date || "").toString().slice(0, 10)
      });
      setMsg(`Bilty number ready: ${f.bilty_number || data.bilty_number}`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setPreparing(false);
    }
  };

  useEffect(() => {
    load()
      .then(() => openNewForm())
      .catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reserveNext = async () => {
    setMsg("");
    setError("");
    try {
      const data = await endpoints.reserveBilty({});
      setMsg(`Reserved ${data.bilty_number}`);
      await load();
      await openNewForm();
    } catch (err) {
      setError(err.message);
    }
  };

  const reserveRange = async () => {
    setMsg("");
    setError("");
    try {
      const data = await endpoints.reserveBiltyRange({
        count: Number(rangeCount)
      });
      setMsg(data.message || `Reserved ${data.reserved?.length || 0} number(s)`);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setMsg("");
    setError("");
    if (!form.id || !form.bilty_number) {
      setError("Open form first so bilty number can be generated");
      return;
    }
    try {
      const payload = {
        bilty_date: form.bilty_date || undefined,
        client_id: form.client_id ? Number(form.client_id) : undefined,
        consignor: form.consignor || undefined,
        consignee: form.consignee || undefined,
        pickup_location: form.pickup_location || undefined,
        drop_location: form.drop_location || undefined,
        goods_description: form.goods_description || undefined,
        weight_kg: form.weight_kg ? Number(form.weight_kg) : undefined,
        packages: form.packages ? Number(form.packages) : undefined,
        status: form.status === "RESERVED" ? "DRAFT" : form.status
      };
      await endpoints.updateBilty(form.id, payload);
      setMsg(`Saved ${form.bilty_number}`);
      await load();
      await openNewForm();
    } catch (err) {
      setError(err.message);
    }
  };

  const openReserved = async (row) => {
    setError("");
    try {
      const data = await endpoints.bilty(row.id);
      const b = data.bilty || row;
      setForm({
        ...empty,
        id: b.id,
        bilty_number: b.bilty_number,
        company_id: b.company_id || "",
        client_id: b.client_id || "",
        consignor: b.consignor || "",
        consignee: b.consignee || "",
        pickup_location: b.pickup_location || "",
        drop_location: b.drop_location || "",
        goods_description: b.goods_description || "",
        weight_kg: b.weight_kg ?? "",
        packages: b.packages ?? "",
        status: b.status || "RESERVED",
        bilty_date: (b.bilty_date || "").toString().slice(0, 10)
      });
      setMsg(`Opened ${b.bilty_number}`);
    } catch (err) {
      setError(err.message);
    }
  };

  const advance = async (row, status) => {
    setError("");
    try {
      await endpoints.updateBilty(row.id, { status });
      setMsg(`Bilty ${row.bilty_number} → ${status}`);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <div className="topbar">
        <div>
          <h1 style={{ margin: 0 }}>Bilty</h1>
          <p className="muted">
            Form khulte hi number auto dikhega. Flow: RESERVED → DRAFT → CONFIRMED → USED
          </p>
        </div>
        <button
          className="btn btn-primary"
          type="button"
          onClick={openNewForm}
          disabled={preparing}
        >
          {preparing ? "Getting number…" : "New bilty form"}
        </button>
      </div>

      <div className="card stack">
        <h3>Reserve (optional bulk)</h3>
        <div className="grid-2">
          <label className="field">
            <span>Range count</span>
            <input
              type="number"
              min={1}
              max={100}
              value={rangeCount}
              onChange={(e) => setRangeCount(e.target.value)}
            />
          </label>
        </div>
        <div className="actions">
          <button className="btn btn-ghost" type="button" onClick={reserveNext}>
            Reserve next number
          </button>
          <button className="btn btn-primary" type="button" onClick={reserveRange}>
            Reserve {rangeCount} numbers
          </button>
        </div>
      </div>

      <form className="card stack" onSubmit={save}>
        <h3>Bilty form</h3>
        <div className="grid-2">
          <label className="field">
            <span>Bilty number (auto)</span>
            <input value={form.bilty_number || (preparing ? "…" : "")} readOnly required />
          </label>
          <label className="field">
            <span>Company id</span>
            <input value={form.company_id || ""} readOnly />
          </label>
          <label className="field">
            <span>Status</span>
            <input value={form.status} readOnly />
          </label>
          <label className="field">
            <span>Bilty date</span>
            <input
              type="date"
              value={form.bilty_date}
              onChange={(e) => setForm({ ...form, bilty_date: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Client</span>
            <select
              value={form.client_id}
              onChange={(e) => setForm({ ...form, client_id: e.target.value })}
            >
              <option value="">Select client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          {[
            ["consignor", "Consignor"],
            ["consignee", "Consignee"],
            ["pickup_location", "From"],
            ["drop_location", "To"],
            ["goods_description", "Goods"],
            ["weight_kg", "Weight (kg)"],
            ["packages", "Packages"]
          ].map(([key, label]) => (
            <label className="field" key={key}>
              <span>{label}</span>
              <input
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              />
            </label>
          ))}
        </div>
        <button className="btn btn-primary" disabled={!form.id}>
          Save bilty
        </button>
      </form>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Number</th>
              <th>Status</th>
              <th>Route</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.id}>
                <td>{b.bilty_number}</td>
                <td>
                  <span className="badge">{b.status}</span>
                </td>
                <td>
                  {b.pickup_location || "?"} → {b.drop_location || "?"}
                </td>
                <td className="actions">
                  <button
                    className="btn btn-ghost"
                    type="button"
                    onClick={() => openReserved(b)}
                  >
                    Open
                  </button>
                  {b.status === "RESERVED" ? (
                    <button
                      className="btn btn-ghost"
                      type="button"
                      onClick={() => advance(b, "DRAFT")}
                    >
                      Mark draft
                    </button>
                  ) : null}
                  {["DRAFT", "CREATED"].includes(b.status) ? (
                    <button
                      className="btn btn-ghost"
                      type="button"
                      onClick={() => advance(b, "CONFIRMED")}
                    >
                      Confirm
                    </button>
                  ) : null}
                  {b.status === "CONFIRMED" ? (
                    <button
                      className="btn btn-ghost"
                      type="button"
                      onClick={() => advance(b, "USED")}
                    >
                      Mark used
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {msg ? <p className="ok">{msg}</p> : null}
      {error ? <p className="error">{error}</p> : null}
    </div>
  );
}
