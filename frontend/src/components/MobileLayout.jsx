import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth";

export default function MobileLayout() {
  const { user, logout, isFieldUser } = useAuth();
  const isDriver = user?.user_type === "DRIVER";

  return (
    <div className="mobile-shell">
      <header className="mobile-top">
        <div>
          <strong>TMS Field</strong>
          <div className="muted" style={{ fontSize: "0.85rem" }}>
            {user?.name || "Crew"} · <span className="badge">{user?.user_type}</span>
          </div>
        </div>
        <button className="btn btn-ghost" type="button" onClick={logout}>
          Logout
        </button>
      </header>

      <main className="mobile-main">
        <Outlet />
      </main>

      <nav className="mobile-nav">
        <NavLink to="/field" end>
          Home
        </NavLink>
        <NavLink to="/field/trips">Trips</NavLink>
        {isDriver ? <NavLink to="/field/expenses">Expenses</NavLink> : null}
        <NavLink to="/field/vehicle">Vehicle</NavLink>
      </nav>

      {!isFieldUser ? (
        <p className="error" style={{ padding: "0.5rem 1rem" }}>
          This area is for Driver/Helper only.
        </p>
      ) : null}
    </div>
  );
}
