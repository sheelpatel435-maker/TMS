// controllers/authController.js
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const userModel = require("../models/userModel");
const refreshTokenModel = require("../models/refreshTokenModel");
const revokedTokenModel = require("../models/revokedTokenModel");
const otpSessionModel = require("../models/otpSessionModel");
const { sendError, HttpError } = require("../utils/httpError");
const {
    assertNotLocked,
    recordFailure,
    clearFailures,
    otpRequestLimiter,
    otpVerifyLimiter,
    passwordChangeLimiter
} = require("../utils/loginAttempts");
const { assertStrongPassword, BCRYPT_ROUNDS } = require("../utils/password");
const { writeAudit } = require("../utils/audit");
const { sendSms } = require("../utils/sms");

const ACCESS_TOKEN_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";
const REFRESH_TOKEN_DAYS = Number(process.env.REFRESH_TOKEN_DAYS || 7);


const OTP_TTL_SECONDS = 5 * 60;
const OTP_MAX_ATTEMPTS = 5;
const OTP_COOLDOWN_SECONDS = 60;
const OTP_HOURLY_LIMIT = 5;
const OTP_PURPOSE = { LOGIN: "LOGIN", RESET: "RESET_PASSWORD" };


const OTP_USER_TYPES = ["DRIVER", "HELPER"];

const MOBILE_RE = /^\d{10,15}$/;
const OTP_RE = /^\d{6}$/;


const DUMMY_HASH = bcrypt.hashSync("tms-dummy-password", BCRYPT_ROUNDS);

const isRequestSecure = (req) =>
    req.secure || req.headers["x-forwarded-proto"] === "https";

const assertSecure = (req) => {
    if (process.env.NODE_ENV === "production" && !isRequestSecure(req)) {
        throw new HttpError(403, "This request requires HTTPS");
    }
};

const normalizeMobile = (value) => String(value || "").replace(/[\s\-+]/g, "");

const isAccountUsable = (user) =>
    Boolean(user) &&
    Number(user.status) === 1 &&
    (!user.company_id || Number(user.company_status) === 1);

const signAccessToken = (user) => {
    const jti = crypto.randomBytes(16).toString("hex");

    const token = jwt.sign(
        {
            id: user.id,
            company_id: user.company_id,
            user_type: user.user_type,
            email: user.email,
            token_version: user.token_version || 1,
            jti
        },
        process.env.JWT_SECRET,
        {
            algorithm: "HS256",
            expiresIn: ACCESS_TOKEN_EXPIRES_IN
        }
    );

    return { token, jti };
};

const issueRefreshToken = async (userId) => {
    const token = crypto.randomBytes(48).toString("hex");
    const expiresAt = new Date(
        Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000
    );

    await refreshTokenModel.create(userId, token, expiresAt);

    return { token, expiresAt };
};

const publicUser = (user) => ({
    id: user.id,
    company_id: user.company_id,
    user_type: user.user_type,
    name: user.name,
    mobile: user.mobile,
    email: user.email,
    last_login_at: user.last_login_at || null
});

const buildLoginResponse = async (user, message) => {
    const { token } = signAccessToken(user);
    const refresh = await issueRefreshToken(user.id);

    return {
        success: true,
        message,
        token,
        refresh_token: refresh.token,
        expires_in: ACCESS_TOKEN_EXPIRES_IN,
        user: publicUser(user)
    };
};

const auditFor = (req, user, action, description) =>
    writeAudit(req, action, "user", user.id, description, {
        userId: user.id,
        companyId: user.company_id
    });

// ---------------------------------------------------------------- login

// body: { identifier | email | mobile, password }
// identifier me "@" ho to email, warna mobile.
const login = async (req, res) => {
    try {
        assertSecure(req);

        const identifier = String(
            req.body.identifier ?? req.body.email ?? req.body.mobile ?? ""
        ).trim();
        const password = req.body.password;

        if (!identifier || typeof password !== "string" || !password) {
            throw new HttpError(400, "Email/mobile and password are required");
        }

        assertNotLocked(req, identifier);

        const user = identifier.includes("@")
            ? await userModel.findAuthByEmail(identifier.toLowerCase())
            : await userModel.findAuthByMobile(normalizeMobile(identifier));

        const passwordMatch = await bcrypt.compare(
            password,
            user ? user.password_hash : DUMMY_HASH
        );

        // Account na ho / inactive ho / company inactive ho / password galat:
        // sabke liye ek hi jawab, taaki pata na chale account exist karta hai ya nahi.
        if (!user || !passwordMatch || !isAccountUsable(user)) {
            recordFailure(req, identifier);

            if (user) {
                const reason = !passwordMatch
                    ? "wrong password"
                    : Number(user.status) !== 1
                      ? "inactive user"
                      : "inactive company";

                await auditFor(req, user, "LOGIN_FAILED", `Login failed: ${reason}`);
            }

            throw new HttpError(401, "Invalid credentials");
        }

        clearFailures(req, identifier);
        await userModel.updateLastLogin(user.id);
        user.last_login_at = new Date();
        await auditFor(req, user, "LOGIN_SUCCESS", "Password login");

        return res
            .status(200)
            .json(await buildLoginResponse(user, "Login successful"));
    } catch (error) {
        return sendError(res, error);
    }
};

// ---------------------------------------------------------------- OTP helpers

const hashOtp = (userId, purpose, otp) =>
    crypto
        .createHmac("sha256", process.env.OTP_SECRET || process.env.JWT_SECRET)
        .update(`${userId}:${purpose}:${otp}`)
        .digest("hex");

const safeEqual = (a, b) => {
    const left = Buffer.from(String(a));
    const right = Buffer.from(String(b));

    return left.length === right.length && crypto.timingSafeEqual(left, right);
};

// OTP sahi ho to consume karta hai (ek hi baar use ho sakta hai).
const consumeOtp = async (user, purpose, otp) => {
    const session = await otpSessionModel.findActive(user.id, purpose);

    if (!session || Number(session.attempts) >= OTP_MAX_ATTEMPTS) {
        return false;
    }

    if (!safeEqual(hashOtp(user.id, purpose, otp), session.otp_hash)) {
        await otpSessionModel.incrementAttempts(session.id);
        return false;
    }

    return (await otpSessionModel.consume(session.id)) === 1;
};

const genericOtpResponse = {
    success: true,
    message: "If this mobile number is registered, an OTP has been sent",
    expires_in: OTP_TTL_SECONDS
};

// Registered na hone par bhi same jawab: koi bhi mobile number check nahi kar sakta.
const requestOtp = (purpose, label) => async (req, res) => {
    try {
        assertSecure(req);

        const mobile = normalizeMobile(req.body.mobile);

        if (!MOBILE_RE.test(mobile)) {
            throw new HttpError(400, "A valid mobile number is required");
        }

        otpRequestLimiter.assert(req.ip);
        otpRequestLimiter.fail(req.ip);

        const user = await userModel.findAuthByMobile(mobile);

        if (
            user &&
            OTP_USER_TYPES.includes(user.user_type) &&
            isAccountUsable(user)
        ) {
            const lastMinute = await otpSessionModel.countRecent(
                user.id,
                purpose,
                OTP_COOLDOWN_SECONDS
            );
            const lastHour = await otpSessionModel.countRecent(
                user.id,
                purpose,
                60 * 60
            );

            if (lastMinute === 0 && lastHour < OTP_HOURLY_LIMIT) {
                const otp = String(crypto.randomInt(100000, 1000000));

                await otpSessionModel.create({
                    userId: user.id,
                    purpose,
                    otpHash: hashOtp(user.id, purpose, otp),
                    ttlSeconds: OTP_TTL_SECONDS,
                    ip: req.ip
                });

                try {
                    await sendSms(
                        mobile,
                        `Your TMS ${label} OTP is ${otp}. Valid for ${OTP_TTL_SECONDS / 60} minutes. Do not share it.`
                    );
                } catch (smsError) {
                    // SMS fail ho to bhi client ko wahi generic jawab (enumeration se bachne ke liye)
                    console.error("SMS SEND ERROR:", smsError.message);
                }

                await auditFor(req, user, "OTP_REQUESTED", `${purpose} OTP requested`);
            }
        }

        return res.status(200).json(genericOtpResponse);
    } catch (error) {
        return sendError(res, error);
    }
};

const requestLoginOtp = requestOtp(OTP_PURPOSE.LOGIN, "login");
const forgotPassword = requestOtp(OTP_PURPOSE.RESET, "password reset");

// body: { mobile, otp }
const verifyLoginOtp = async (req, res) => {
    try {
        assertSecure(req);

        const mobile = normalizeMobile(req.body.mobile);
        const otp = String(req.body.otp || "").trim();

        if (!MOBILE_RE.test(mobile) || !OTP_RE.test(otp)) {
            throw new HttpError(400, "Mobile and a 6 digit OTP are required");
        }

        const key = `${req.ip}:${mobile}`;
        otpVerifyLimiter.assert(key);

        const user = await userModel.findAuthByMobile(mobile);
        const valid =
            user &&
            OTP_USER_TYPES.includes(user.user_type) &&
            isAccountUsable(user) &&
            (await consumeOtp(user, OTP_PURPOSE.LOGIN, otp));

        if (!valid) {
            otpVerifyLimiter.fail(key);

            if (user) {
                await auditFor(req, user, "OTP_LOGIN_FAILED", "Invalid or expired OTP");
            }

            throw new HttpError(401, "Invalid or expired OTP");
        }

        otpVerifyLimiter.clear(key);
        await userModel.markMobileVerified(user.id);
        await userModel.updateLastLogin(user.id);
        user.last_login_at = new Date();
        await auditFor(req, user, "OTP_LOGIN_SUCCESS", "OTP login");

        return res
            .status(200)
            .json(await buildLoginResponse(user, "Login successful"));
    } catch (error) {
        return sendError(res, error);
    }
};

// ---------------------------------------------------------------- password

// body: { mobile, otp, new_password }
const resetPassword = async (req, res) => {
    try {
        assertSecure(req);

        const mobile = normalizeMobile(req.body.mobile);
        const otp = String(req.body.otp || "").trim();

        if (!MOBILE_RE.test(mobile) || !OTP_RE.test(otp)) {
            throw new HttpError(400, "Mobile and a 6 digit OTP are required");
        }

        // Pehle password check, taaki kamzor password par OTP waste na ho
        const newPassword = assertStrongPassword(req.body.new_password);

        const key = `${req.ip}:${mobile}`;
        otpVerifyLimiter.assert(key);

        const user = await userModel.findAuthByMobile(mobile);
        const valid =
            user &&
            OTP_USER_TYPES.includes(user.user_type) &&
            isAccountUsable(user) &&
            (await consumeOtp(user, OTP_PURPOSE.RESET, otp));

        if (!valid) {
            otpVerifyLimiter.fail(key);

            if (user) {
                await auditFor(req, user, "PASSWORD_RESET_FAILED", "Invalid or expired OTP");
            }

            throw new HttpError(401, "Invalid or expired OTP");
        }

        otpVerifyLimiter.clear(key);
        await userModel.updatePassword(
            user.id,
            await bcrypt.hash(newPassword, BCRYPT_ROUNDS)
        );
        await userModel.markMobileVerified(user.id);
        await refreshTokenModel.revokeAllForUser(user.id);
        await auditFor(req, user, "PASSWORD_RESET", "Password reset using OTP");

        return res.status(200).json({
            success: true,
            message: "Password reset successfully. Please login again"
        });
    } catch (error) {
        return sendError(res, error);
    }
};

// body: { current_password, new_password }
const changePassword = async (req, res) => {
    try {
        const { current_password: current, new_password: next } = req.body;

        if (typeof current !== "string" || !current || !next) {
            throw new HttpError(
                400,
                "current_password and new_password are required"
            );
        }

        const newPassword = assertStrongPassword(next);
        const key = String(req.user.id);

        passwordChangeLimiter.assert(key);

        const user = await userModel.findAuthById(req.user.id);

        if (!user) {
            throw new HttpError(404, "User not found");
        }

        if (!(await bcrypt.compare(current, user.password_hash))) {
            passwordChangeLimiter.fail(key);
            await auditFor(req, user, "PASSWORD_CHANGE_FAILED", "Wrong current password");
            throw new HttpError(400, "Current password is incorrect");
        }

        if (await bcrypt.compare(newPassword, user.password_hash)) {
            throw new HttpError(
                400,
                "New password must be different from the current password"
            );
        }

        passwordChangeLimiter.clear(key);
        await userModel.updatePassword(
            user.id,
            await bcrypt.hash(newPassword, BCRYPT_ROUNDS)
        );
        await refreshTokenModel.revokeAllForUser(user.id);
        await auditFor(req, user, "PASSWORD_CHANGED", "Password changed by user");

        // token_version badh gaya, isliye current token ab invalid hai.
        // Isi device ko naya token de dete hain, baaki sab devices logout ho gaye.
        const fresh = await userModel.findAuthById(user.id);
        const response = await buildLoginResponse(fresh, "Password changed successfully");

        return res.status(200).json(response);
    } catch (error) {
        return sendError(res, error);
    }
};

// ---------------------------------------------------------------- session

const refresh = async (req, res) => {
    try {
        const refreshToken = req.body.refresh_token;

        if (!refreshToken || typeof refreshToken !== "string") {
            throw new HttpError(400, "refresh_token is required");
        }

        const stored = await refreshTokenModel.findByToken(refreshToken);

        if (!stored) {
            throw new HttpError(401, "Invalid refresh token");
        }

        // Revoked token dobara use hua = chori ka shak, user ke saare tokens band
        if (stored.revoked_at) {
            await refreshTokenModel.revokeAllForUser(stored.user_id);
            await userModel.bumpTokenVersion(stored.user_id);
            throw new HttpError(401, "Refresh token has been revoked");
        }

        if (new Date(stored.expires_at) <= new Date()) {
            throw new HttpError(401, "Refresh token has expired");
        }

        const user = await userModel.findAuthById(stored.user_id);

        if (!isAccountUsable(user)) {
            throw new HttpError(401, "User account is not active");
        }

        // Atomic rotate: do parallel requests me se sirf ek hi token use kar payegi
        if (!(await refreshTokenModel.revokeByToken(refreshToken))) {
            throw new HttpError(401, "Refresh token has been revoked");
        }

        const { token } = signAccessToken(user);
        const nextRefresh = await issueRefreshToken(user.id);

        return res.status(200).json({
            success: true,
            message: "Token refreshed",
            token,
            refresh_token: nextRefresh.token,
            expires_in: ACCESS_TOKEN_EXPIRES_IN
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const logout = async (req, res) => {
    try {
        if (req.tokenPayload?.jti && req.tokenPayload?.exp) {
            await revokedTokenModel.revoke({
                jti: req.tokenPayload.jti,
                userId: req.user.id,
                expiresAt: new Date(req.tokenPayload.exp * 1000)
            });
        }

        if (req.body?.refresh_token) {
            await refreshTokenModel.revokeByToken(req.body.refresh_token);
        }

        await writeAudit(req, "LOGOUT", "user", req.user.id, "User logged out");

        return res.status(200).json({
            success: true,
            message: "Logged out successfully"
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const profile = async (req, res) => {
    try {
        const user = await userModel.findAuthById(req.user.id);

        if (!user) {
            throw new HttpError(404, "User not found");
        }

        return res.status(200).json({
            success: true,
            user: publicUser(user)
        });
    } catch (error) {
        return sendError(res, error);
    }
};

// Purana endpoint. Users sirf Users module (createUser) se bante hain, kyunki wahan
// mobile/email validation, uniqueness aur audit hai. Route hata sakte ho.
const register = (req, res) =>
    res.status(410).json({
        success: false,
        message: "This endpoint is removed. Create users from the Users module"
    });

const createSession = (user) => {
    const { token } = signAccessToken(user);

    return {
        token,
        user: publicUser(user)
    };
};

module.exports = {
    login,
    requestLoginOtp,
    verifyLoginOtp,
    forgotPassword,
    resetPassword,
    changePassword,
    refresh,
    logout,
    profile,
    register,
    createSession
};
