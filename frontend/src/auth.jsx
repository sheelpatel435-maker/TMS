import { createContext, useContext, useMemo, useState } from "react";
import {
  api,
  clearSession,
  endpoints,
  getStoredUser,
  getToken,
  saveSession
} from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredUser());
  const [authed, setAuthed] = useState(() => Boolean(getToken()));

  const value = useMemo(
    () => ({
      user,
      authed,
      async login(email, password) {
        const data = await endpoints.login({ email, password });
        if (!data?.token || !data?.user) {
          throw new Error("Invalid email or password");
        }
        saveSession(data);
        setUser(data.user);
        setAuthed(true);
        return data.user;
      },
      async logout() {
        try {
          await api("/api/logout", {
            method: "POST",
            body: { refresh_token: localStorage.getItem("tms_refresh") }
          });
        } catch {
          /* ignore */
        }
        clearSession();
        setUser(null);
        setAuthed(false);
      },
      isSuperAdmin: user?.user_type === "SUPER_ADMIN",
      isAdmin:
        user?.user_type === "SUPER_ADMIN" ||
        user?.user_type === "COMPANY_ADMIN"
    }),
    [user, authed]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
