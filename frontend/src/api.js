const API_BASE =
  (import.meta.env.VITE_API_URL || "https://tms-t8ln.onrender.com").replace(
    /\/$/,
    ""
  );

const TOKEN_KEY = "tms_token";
const REFRESH_KEY = "tms_refresh";
const USER_KEY = "tms_user";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
};

export const saveSession = ({ token, refresh_token, user }) => {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (refresh_token) localStorage.setItem(REFRESH_KEY, refresh_token);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const clearSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
};

async function refreshAccessToken() {
  const refresh = localStorage.getItem(REFRESH_KEY);
  if (!refresh) throw new Error("Session expired");

  const res = await fetch(`${API_BASE}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refresh })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    clearSession();
    throw new Error(data.message || "Session expired");
  }
  saveSession(data);
  return data.token;
}

export async function api(path, { method = "GET", body, auth = true, retry = true, formData } = {}) {
  const headers = {};
  if (body !== undefined && !formData) headers["Content-Type"] = "application/json";
  if (auth && getToken()) headers.Authorization = `Bearer ${getToken()}`;

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: formData
        ? formData
        : body !== undefined
          ? JSON.stringify(body)
          : undefined
    });
  } catch {
    throw new Error(
      `Unable to reach the TMS API at ${API_BASE}. The service may be waking up — retry in 30s.`
    );
  }

  const data = await res.json().catch(() => null);

  if (res.status === 401 && auth && retry) {
    await refreshAccessToken();
    return api(path, { method, body, auth, retry: false, formData });
  }

  if (!res.ok || data?.success === false) {
    throw new Error(data?.message || `Request failed (${res.status})`);
  }

  return data || { success: true };
}

export const endpoints = {
  login: (body) => api("/api/login", { method: "POST", body, auth: false }),
  profile: () => api("/api/profile"),
  dashboard: () => api("/api/dashboard"),
  companies: () => api("/api/companies"),
  createCompany: (body) => api("/api/companies", { method: "POST", body }),
  users: () => api("/api/users?limit=100"),
  createUser: (body) => api("/api/users", { method: "POST", body }),
  modules: () => api("/api/modules?limit=100"),
  setUserAccess: (userId, body) =>
    api(`/api/user-module-access/${userId}`, { method: "PUT", body }),
  drivers: () => api("/api/drivers?limit=100"),
  createDriver: (body) => api("/api/drivers", { method: "POST", body }),
  helpers: () => api("/api/helpers?limit=100"),
  createHelper: (body) => api("/api/helpers", { method: "POST", body }),
  clients: () => api("/api/clients?limit=100"),
  vehicles: () => api("/api/vehicles?limit=100"),
  createVehicle: (body) => api("/api/vehicles", { method: "POST", body }),
  updateVehicle: (id, body) => api(`/api/vehicles/${id}`, { method: "PUT", body }),
  vehicleTripHistory: (id) => api(`/api/vehicles/${id}/trip-history?limit=50`),
  vehicleTypes: () => api("/api/vehicle-types?limit=100"),
  createVehicleType: (body) => api("/api/vehicle-types", { method: "POST", body }),
  vehicleDocuments: (vehicleId) =>
    api(`/api/vehicle-documents/${vehicleId}?limit=100`),
  vehicleDocumentTypes: () => api("/api/vehicle-documents/types"),
  createVehicleDocumentType: (body) =>
    api("/api/vehicle-documents/types", { method: "POST", body }),
  createVehicleDocument: (vehicleId, formData) =>
    api(`/api/vehicle-documents/${vehicleId}`, {
      method: "POST",
      formData
    }),
  verifyVehicleDocument: (id, body) =>
    api(`/api/vehicle-documents/${id}/verification`, {
      method: "PATCH",
      body
    }),
  assignments: () => api("/api/vehicle-assignments?limit=100"),
  createAssignment: (body) =>
    api("/api/vehicle-assignments", { method: "POST", body }),
  closeAssignment: (id) =>
    api(`/api/vehicle-assignments/${id}/close`, { method: "PATCH", body: {} }),
  expiringDocuments: () => api("/api/documents/expiring?limit=50"),
  fileUrl: (path) =>
    path?.startsWith("http") ? path : `${API_BASE}${path || ""}`,
  bilties: () => api("/api/bilties?limit=100"),
  reserveBilty: (body) => api("/api/bilties/reserve", { method: "POST", body }),
  createBilty: (body) => api("/api/bilties", { method: "POST", body }),
  updateBilty: (id, body) => api(`/api/bilties/${id}`, { method: "PUT", body }),
  trips: () => api("/api/trips?limit=100"),
  createTrip: (body) => api("/api/trips", { method: "POST", body }),
  updateTripStatus: (id, status) =>
    api(`/api/trips/${id}/status`, { method: "PATCH", body: { status } })
};

export { API_BASE };
