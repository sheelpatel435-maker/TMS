import { NavLink, Outlet } from "react-router-dom";
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
  const { user, logout, isSuperAdmin, isAdmin } = useAuth();

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
          </div>
          <button className="btn btn-ghost" style={{ marginTop: "0.7rem" }} onClick={logout}>
            Logout
          </button>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
