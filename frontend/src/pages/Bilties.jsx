import { useEffect, useState } from "react";
import { endpoints } from "../api";

const empty = {
  bilty_number: "",
  client_id: "",
  consignor: "",
  consignee: "",
  pickup_location: "",
  drop_location: "",
  goods_description: "",
  weight_kg: "",
  packages: "",
  status: "DRAFT"
};

export default function Bilties() {
  const [rows, setRows] = useState([]);
  const [clients, setClients] = useState([]);
  const [reserveNo, setReserveNo] = useState("");
  const [form, setForm] = useState(empty);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    const [bilties, clientData] = await Promise.all([
      endpoints.bilties(),
      endpoints.clients().catch(() => ({ clients: [] }))
    ]);
    setRows(bilties.bilties || []);
    setClients(clientData.clients || []);
  };

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  const reserve = async (e) => {
    e.preventDefault();
    setMsg("");
    setError("");
    try {
      await endpoints.reserveBilty({ bilty_number: reserveNo });
      setReserveNo("");
      setMsg("Bilty number reserved");
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const create = async (e) => {
    e.preventDefault();
    setMsg("");
    setError("");
    try {
      await endpoints.createBilty({
        ...form,
        client_id: form.client_id ? Number(form.client_id) : undefined,
        weight_kg: form.weight_kg ? Number(form.weight_kg) : undefined,
        packages: form.packages ? Number(form.packages) : undefined
      });
      setForm(empty);
      setMsg("Bilty created");
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const advance = async (row, status) => {
    setError("");
    try {
      await endpoints.updateBilty(row.id, { ...row, status });
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
            Flow: RESERVED → DRAFT → CONFIRMED / USED → CANCELLED
          </p>
        </div>
      </div>

      <form className="card stack" onSubmit={reserve}>
        <h3>Reserve bilty number</h3>
        <div className="grid-2">
          <label className="field">
            <span>Bilty number</span>
            <input
              required
              value={reserveNo}
              onChange={(e) => setReserveNo(e.target.value)}
            />
          </label>
        </div>
        <button className="btn btn-primary">Reserve</button>
      </form>

      <form className="card stack" onSubmit={create}>
        <h3>Create / open bilty</h3>
        <div className="grid-2">
          <label className="field">
            <span>Bilty number</span>
            <input
              required
              value={form.bilty_number}
              onChange={(e) => setForm({ ...form, bilty_number: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Status</span>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="DRAFT">DRAFT</option>
              <option value="RESERVED">RESERVED</option>
              <option value="CONFIRMED">CONFIRMED</option>
            </select>
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
            ["pickup_location", "Pickup"],
            ["drop_location", "Destination"],
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
        <button className="btn btn-primary">Save bilty</button>
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
                  {b.status === "RESERVED" ? (
                    <button className="btn btn-ghost" type="button" onClick={() => advance(b, "DRAFT")}>
                      Open draft
                    </button>
                  ) : null}
                  {["DRAFT", "CREATED"].includes(b.status) ? (
                    <button className="btn btn-ghost" type="button" onClick={() => advance(b, "CONFIRMED")}>
                      Confirm
                    </button>
                  ) : null}
                  {b.status === "CONFIRMED" ? (
                    <button className="btn btn-ghost" type="button" onClick={() => advance(b, "USED")}>
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
