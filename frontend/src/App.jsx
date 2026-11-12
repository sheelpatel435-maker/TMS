import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Companies from "./pages/Companies";
import Users from "./pages/Users";
import Drivers from "./pages/Drivers";
import Helpers from "./pages/Helpers";
import Bilties from "./pages/Bilties";
import Trips from "./pages/Trips";

function RequireAuth({ children, adminOnly = false, superOnly = false }) {
  const { authed, isAdmin, isSuperAdmin } = useAuth();
  if (!authed) return <Navigate to="/login" replace />;
  if (superOnly && !isSuperAdmin) return <Navigate to="/" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  const { authed } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={authed ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
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
              <Users />
            </RequireAuth>
          }
        />
        <Route path="drivers" element={<Drivers />} />
        <Route path="helpers" element={<Helpers />} />
        <Route path="bilties" element={<Bilties />} />
        <Route path="trips" element={<Trips />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
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
