import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Companies from "./pages/Companies";
import Users from "./pages/Users";
import Vehicles from "./pages/Vehicles";
import Drivers from "./pages/Drivers";
import Helpers from "./pages/Helpers";
import Bilties from "./pages/Bilties";
import Trips from "./pages/Trips";
import Clients from "./pages/Clients";
import Invoices from "./pages/Invoices";
import Payments from "./pages/Payments";

function RequireAuth({ children, adminOnly = false, superOnly = false }) {
  const { authed, isAdmin, isSuperAdmin } = useAuth();
  if (!authed) return <Navigate to="/login" replace />;
  if (superOnly && !isSuperAdmin) return <Navigate to="/" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;
  return children;
}

/** Super Admin without company context cannot use tenant screens yet. */
function RequireCompanyContext({ children }) {
  const { needsCompanyContext } = useAuth();
  if (needsCompanyContext) {
    return <Navigate to="/companies" replace />;
  }
  return children;
}

function homePath(authed, needsCompanyContext) {
  if (!authed) return "/login";
  if (needsCompanyContext) return "/companies";
  return "/";
}

function AppRoutes() {
  const { authed, needsCompanyContext } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={
          authed ? (
            <Navigate to={homePath(true, needsCompanyContext)} replace />
          ) : (
            <Login />
          )
        }
      />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route
          index
          element={
            <RequireCompanyContext>
              <Dashboard />
            </RequireCompanyContext>
          }
        />
        <Route
          path="companies"
          element={
            <RequireAuth superOnly>
              <Companies />
            </RequireAuth>
          }
        />
        <Route
          path="users"
          element={
            <RequireAuth adminOnly>
              <RequireCompanyContext>
                <Users />
              </RequireCompanyContext>
            </RequireAuth>
          }
        />
        <Route
          path="vehicles"
          element={
            <RequireCompanyContext>
              <Vehicles />
            </RequireCompanyContext>
          }
        />
        <Route
          path="drivers"
          element={
            <RequireCompanyContext>
              <Drivers />
            </RequireCompanyContext>
          }
        />
        <Route
          path="helpers"
          element={
            <RequireCompanyContext>
              <Helpers />
            </RequireCompanyContext>
          }
        />
        <Route
          path="bilties"
          element={
            <RequireCompanyContext>
              <Bilties />
            </RequireCompanyContext>
          }
        />
        <Route
          path="trips"
          element={
            <RequireCompanyContext>
              <Trips />
            </RequireCompanyContext>
          }
        />
        <Route
          path="clients"
          element={
            <RequireCompanyContext>
              <Clients />
            </RequireCompanyContext>
          }
        />
        <Route
          path="invoices"
          element={
            <RequireCompanyContext>
              <Invoices />
            </RequireCompanyContext>
          }
        />
        <Route
          path="payments"
          element={
            <RequireCompanyContext>
              <Payments />
            </RequireCompanyContext>
          }
        />
      </Route>
      <Route
        path="*"
        element={<Navigate to={homePath(authed, needsCompanyContext)} replace />}
      />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
