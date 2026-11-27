import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, isFieldType } from "../auth";
import { API_BASE, endpoints } from "../api";

function redirectForUser(user, navigate) {
  if (isFieldType(user?.user_type)) {
    navigate("/field", { replace: true });
    return;
  }
  if (user?.user_type === "SUPER_ADMIN" && !user?.company_id) {
    navigate("/companies", { replace: true });
    return;
  }
  navigate("/", { replace: true });
}

export default function Login() {
  const { login, loginWithOtp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("desk"); // desk | field-password | field-otp
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const onPasswordLogin = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      const user = await login(identifier.trim(), password);
      redirectForUser(user, navigate);
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const onRequestOtp = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      const data = await endpoints.requestLoginOtp({
        mobile: identifier.trim()
      });
      setOtpSent(true);
      setInfo(data.message || "If registered, OTP has been sent");
    } catch (err) {
      setError(err.message || "OTP request failed");
    } finally {
      setLoading(false);
    }
  };

  const onVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await loginWithOtp(identifier.trim(), otp.trim());
      redirectForUser(user, navigate);
    } catch (err) {
      setError(err.message || "OTP login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrap">
      <form
        className="login-card stack"
        onSubmit={
          mode === "field-otp"
            ? otpSent
              ? onVerifyOtp
              : onRequestOtp
            : onPasswordLogin
        }
      >
        <div>
          <h1>TMS Sign in</h1>
          <p className="muted">API: {API_BASE}</p>
        </div>

        <div className="actions" style={{ flexWrap: "wrap" }}>
          <button
            type="button"
            className={`btn ${mode === "desk" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setMode("desk")}
          >
            Office
          </button>
          <button
            type="button"
            className={`btn ${mode === "field-password" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setMode("field-password")}
          >
            Driver/Helper (password)
          </button>
          <button
            type="button"
            className={`btn ${mode === "field-otp" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => {
              setMode("field-otp");
              setOtpSent(false);
              setOtp("");
            }}
          >
            Driver/Helper (OTP)
          </button>
        </div>

        <label className="field">
          <span>{mode === "desk" ? "Email" : "Mobile"}</span>
          <input
            type={mode === "desk" ? "email" : "tel"}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            autoComplete="username"
            placeholder={mode === "desk" ? "admin@company.com" : "9876543210"}
          />
        </label>

        {mode !== "field-otp" ? (
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>
        ) : null}

        {mode === "field-otp" && otpSent ? (
          <label className="field">
            <span>OTP</span>
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
              inputMode="numeric"
              placeholder="6 digit OTP"
            />
          </label>
        ) : null}

        {info ? <p className="ok">{info}</p> : null}
        {error ? <p className="error">{error}</p> : null}

        <button className="btn btn-primary" disabled={loading}>
          {loading
            ? "Please wait…"
            : mode === "field-otp"
              ? otpSent
                ? "Verify OTP"
                : "Send OTP"
              : "Sign in"}
        </button>
      </form>
    </div>
  );
}
