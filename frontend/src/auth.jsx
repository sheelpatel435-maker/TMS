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

const isFieldType = (userType) =>
  userType === "DRIVER" || userType === "HELPER";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredUser());
  const [authed, setAuthed] = useState(() => Boolean(getToken()));

  const value = useMemo(
    () => ({
      user,
      authed,
      async login(identifier, password) {
        const trimmed = String(identifier || "").trim();
        const body = trimmed.includes("@")
          ? { email: trimmed.toLowerCase(), password }
          : { mobile: trimmed, identifier: trimmed, password };
        const data = await endpoints.login(body);
        if (!data?.token || !data?.user) {
          throw new Error("Invalid credentials");
        }
        saveSession(data);
        setUser(data.user);
        setAuthed(true);
        return data.user;
      },
      async loginWithOtp(mobile, otp) {
        const data = await endpoints.verifyLoginOtp({
          mobile: String(mobile || "").trim(),
          otp: String(otp || "").trim()
        });
        if (!data?.token || !data?.user) {
          throw new Error("Invalid or expired OTP");
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
      applySession(data) {
        saveSession(data);
        if (data?.user) setUser(data.user);
        if (data?.token) setAuthed(true);
      },
      isSuperAdmin: user?.user_type === "SUPER_ADMIN",
      isAdmin:
        user?.user_type === "SUPER_ADMIN" ||
        user?.user_type === "COMPANY_ADMIN",
      isFieldUser: isFieldType(user?.user_type),
      // Super Admin must pick a company before tenant APIs work
      needsCompanyContext:
        user?.user_type === "SUPER_ADMIN" && !user?.company_id
    }),
    [user, authed]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

export { isFieldType };
