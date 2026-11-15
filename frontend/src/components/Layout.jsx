import { NavLink, Outlet, Link } from "react-router-dom";
import { useAuth } from "../auth";

const links = [
  { to: "/", label: "Dashboard" },
  { to: "/companies", label: "Companies", superOnly: true },
  { to: "/users", label: "Users", adminOnly: true },
  { to: "/vehicles", label: "Vehicles" },
  { to: "/drivers", label: "Drivers" },
  { to: "/helpers", label: "Helpers" },
  { to: "/bilties", label: "Bilty" },
  { to: "/trips", label: "Trips" }
];

export default function Layout() {
  const { user, logout, isSuperAdmin, isAdmin, needsCompanyContext } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          TMS <span>Desk</span>
        </div>
        <nav className="nav">
          {links
            .filter((l) => {
              if (l.superOnly) return isSuperAdmin;
              if (l.adminOnly) return isAdmin;
              return true;
            })
            .map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === "/"}
                className={({ isActive }) => (isActive ? "active" : undefined)}
              >
                {l.label}
              </NavLink>
            ))}
        </nav>
        <div style={{ marginTop: "auto" }}>
          <div className="muted" style={{ fontSize: "0.85rem" }}>
            {user?.name}
            <br />
            <span className="badge">{user?.user_type}</span>
            {isSuperAdmin && user?.company_id ? (
              <>
                <br />
                <span className="badge">Company #{user.company_id}</span>
              </>
            ) : null}
          </div>
          <button className="btn btn-ghost" style={{ marginTop: "0.7rem" }} onClick={logout}>
            Logout
          </button>
        </div>
      </aside>
      <main className="main">
        {needsCompanyContext ? (
          <div className="card" style={{ marginBottom: "1rem" }}>
            <strong>Select a company first</strong>
            <p className="muted" style={{ margin: "0.4rem 0 0" }}>
              Super Admin must pick an active company before Dashboard, Vehicles,
              and other tenant screens work.{" "}
              <Link to="/companies">Go to Companies</Link>
            </p>
          </div>
        ) : null}
        <Outlet />
      </main>
    </div>
  );
}
