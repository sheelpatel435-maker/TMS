const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const userModel = require("../models/userModel");
const companyModel = require("../models/companyModel");
const refreshTokenModel = require("../models/refreshTokenModel");
const revokedTokenModel = require("../models/revokedTokenModel");
const { sendError, HttpError } = require("../utils/httpError");
const {
    assertNotLocked,
    recordFailure,
    clearFailures
} = require("../utils/loginAttempts");
const { assertStrongPassword, BCRYPT_ROUNDS } = require("../utils/password");
const { sendPasswordOtp } = require("../utils/mailer");
const { isAdmin, isSuperAdmin } = require("../utils/roles");
const { resolveCompanyId } = require("../utils/companyScope");

const ACCESS_TOKEN_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";
const REFRESH_TOKEN_DAYS = Number(process.env.REFRESH_TOKEN_DAYS || 7);

const isRequestSecure = (req) =>
    req.secure || req.headers["x-forwarded-proto"] === "https";

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

const login = async (req, res) => {
    try {
        if (process.env.NODE_ENV === "production" && !isRequestSecure(req)) {
            throw new HttpError(403, "Login requires HTTPS");
        }

        const { email, password } = req.body;

        if (!email || !password) {
            throw new HttpError(400, "Email and password are required");
        }

        assertNotLocked(req);

        const user = await userModel.findUserByEmail(email);

        if (!user) {
            recordFailure(req);
            throw new HttpError(401, "Invalid email or password");
        }

        if (user.status !== 1) {
            recordFailure(req);
            throw new HttpError(403, "User account is not active");
        }

        const passwordMatch = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!passwordMatch) {
            recordFailure(req);
            throw new HttpError(401, "Invalid email or password");
        }

        clearFailures(req);
        await userModel.updateLastLogin(user.id);
        user.last_login_at = new Date();

        const { token } = signAccessToken(user);
        const refresh = await issueRefreshToken(user.id);

        return res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            refresh_token: refresh.token,
            expires_in: ACCESS_TOKEN_EXPIRES_IN,
            user: publicUser(user)
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const refresh = async (req, res) => {
    try {
        const refreshToken = req.body.refresh_token;

        if (!refreshToken) {
            throw new HttpError(400, "refresh_token is required");
        }

        const stored = await refreshTokenModel.findByToken(refreshToken);

        if (!stored) {
            throw new HttpError(401, "Invalid refresh token");
        }

        if (stored.revoked_at) {
            await refreshTokenModel.revokeAllForUser(stored.user_id);
            await userModel.bumpTokenVersion(stored.user_id);
            throw new HttpError(401, "Refresh token has been revoked");
        }

        if (new Date(stored.expires_at) <= new Date()) {
            throw new HttpError(401, "Refresh token has expired");
        }

        const user = await userModel.findUserById(stored.user_id);

        if (!user || user.status !== 1) {
            throw new HttpError(401, "User account is not active");
        }

        await refreshTokenModel.revokeByToken(refreshToken);

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
        const user = await userModel.findUserById(req.user.id);

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

const register = async (req, res) => {
    try {
        if (!isAdmin(req.user)) {
            throw new HttpError(403, "Admin access is required to create users");
        }

        const name = String(req.body.name || "").trim();
        const mobile = String(req.body.mobile || "").trim();
        const email = String(req.body.email || "").trim().toLowerCase();
        const password = assertStrongPassword(req.body.password);

        if (!name || !mobile) {
            throw new HttpError(400, "Name and mobile are required");
        }

        const companyId = isSuperAdmin(req.user)
            ? resolveCompanyId(req)
            : req.user.company_id;

        const company = await companyModel.getById(companyId);

        if (!company || Number(company.status) !== 1) {
            throw new HttpError(400, "Company not found");
        }

        if (email) {
            const existing = await userModel.findUserByEmail(email);

            if (existing) {
                throw new HttpError(409, "Email is already registered");
            }
        }

        const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
        const userId = await userModel.createUser({
            company_id: company.id,
            user_type: "COMPANY_USER",
            name,
            mobile,
            email: email || null,
            password_hash: passwordHash
        });

        return res.status(201).json({
            success: true,
            message: "Account created successfully",
            id: userId
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const OTP_MINUTES = 10;
const RESET_TOKEN_EXPIRES_IN = "15m";
const MAX_OTP_ATTEMPTS = 5;
const FORGOT_MESSAGE = "If the account exists, an OTP has been sent";

const forgotPassword = async (req, res) => {
    try {
        const email = String(req.body.email || "").trim().toLowerCase();

        if (!email) {
            throw new HttpError(400, "Email is required");
        }

        const user = await userModel.findForPasswordReset(email);

        if (!user || Number(user.status) !== 1) {
            return res.status(200).json({
                success: true,
                message: FORGOT_MESSAGE
            });
        }

        const otp = String(crypto.randomInt(100000, 1000000));
        const otpHash = await bcrypt.hash(otp, BCRYPT_ROUNDS);
        const expiresAt = new Date(Date.now() + OTP_MINUTES * 60 * 1000);

        await sendPasswordOtp(user.email, user.name, otp);
        await userModel.savePasswordOtp(user.id, otpHash, expiresAt);

        return res.status(200).json({
            success: true,
            message: FORGOT_MESSAGE
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const verifyOtp = async (req, res) => {
    try {
        const email = String(req.body.email || "").trim().toLowerCase();
        const otp = String(req.body.otp || "").trim();

        if (!email || !otp) {
            throw new HttpError(400, "Email and OTP are required");
        }

        const user = await userModel.findForPasswordReset(email);

        if (!user || Number(user.status) !== 1 || !user.otp_hash || !user.otp_expires_at) {
            throw new HttpError(400, "Invalid or expired OTP");
        }

        if (Number(user.otp_attempts) >= MAX_OTP_ATTEMPTS) {
            throw new HttpError(429, "Too many OTP attempts. Request a new OTP");
        }

        if (new Date(user.otp_expires_at) <= new Date()) {
            throw new HttpError(400, "Invalid or expired OTP");
        }

        const match = await bcrypt.compare(otp, user.otp_hash);

        if (!match) {
            await userModel.incrementOtpAttempts(user.id);
            throw new HttpError(400, "Invalid or expired OTP");
        }

        const resetToken = jwt.sign(
            {
                id: user.id,
                email: user.email,
                purpose: "password_reset"
            },
            process.env.JWT_SECRET,
            { expiresIn: RESET_TOKEN_EXPIRES_IN }
        );

        return res.status(200).json({
            success: true,
            message: "OTP verified",
            reset_token: resetToken
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const resetPassword = async (req, res) => {
    try {
        const { reset_token: resetToken, new_password: newPassword } = req.body;

        if (!resetToken || !newPassword) {
            throw new HttpError(400, "reset_token and new_password are required");
        }

        assertStrongPassword(newPassword);

        let payload;

        try {
            payload = jwt.verify(resetToken, process.env.JWT_SECRET);
        } catch (error) {
            throw new HttpError(401, "Invalid or expired reset token");
        }

        if (payload.purpose !== "password_reset" || !payload.id) {
            throw new HttpError(401, "Invalid or expired reset token");
        }

        const user = await userModel.findForPasswordReset(payload.email);

        if (!user || Number(user.id) !== Number(payload.id) || Number(user.status) !== 1) {
            throw new HttpError(401, "Invalid or expired reset token");
        }

        if (!user.otp_hash) {
            throw new HttpError(400, "OTP is no longer valid. Request a new one");
        }

        const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
        await userModel.resetPassword(user.id, passwordHash);
        await refreshTokenModel.revokeAllForUser(user.id);

        return res.status(200).json({
            success: true,
            message: "Password reset successfully"
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const createSession = (user) => {
    const { token } = signAccessToken(user);

    return {
        token,
        user: publicUser(user)
    };
};

module.exports = {
    login,
    refresh,
    logout,
    profile,
    register,
    createSession,
    forgotPassword,
    verifyOtp,
    resetPassword
};
