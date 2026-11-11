const jwt = require("jsonwebtoken");
const db = require("../config/db");
const userModel = require("../models/userModel");
const revokedTokenModel = require("../models/revokedTokenModel");
const { sendError } = require("../utils/httpError");
const { isSuperAdmin } = require("../utils/roles");

const extractToken = (req) => {
    const authHeader = req.headers?.authorization;

    if (typeof authHeader === "string") {
        const match = authHeader.match(/^Bearer\s+(.+)$/i);
        return match ? match[1].trim() : null;
    }

    return null;
};

const reject = (res, status, message) =>
    res.status(status).json({
        success: false,
        message
    });

const readRequestedCompanyId = (req) => {
    const rawValue =
        req.headers?.["x-company-id"] ??
        req.query?.company_id ??
        req.body?.company_id;

    if (rawValue === undefined || rawValue === null || rawValue === "") {
        return null;
    }

    if (
        (typeof rawValue !== "string" && typeof rawValue !== "number") ||
        (typeof rawValue === "string" && !/^\d+$/.test(rawValue))
    ) {
        return Number.NaN;
    }

    const value = Number(rawValue);
    return Number.isSafeInteger(value) && value > 0 ? value : Number.NaN;
};

const authMiddleware = async (req, res, next) => {
    const token = extractToken(req);

    if (!token) {
        return reject(res, 401, "Authorization token is required");
    }

    let decoded;

    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET, {
            algorithms: ["HS256"]
        });
    } catch (error) {
        return reject(res, 401, "Invalid or expired token");
    }

    try {
        if (
            !decoded ||
            typeof decoded !== "object" ||
            !(decoded.id || decoded.user_id) ||
            typeof decoded.jti !== "string" ||
            !decoded.jti ||
            !Number.isSafeInteger(Number(decoded.token_version))
        ) {
            return reject(res, 401, "Invalid or expired token");
        }

        if (await revokedTokenModel.isRevoked(decoded.jti)) {
            return reject(res, 401, "Token has been revoked");
        }

        const user = await userModel.findAuthById(decoded.id || decoded.user_id);

        if (!user) {
            return reject(res, 401, "Invalid or expired token");
        }

        if (Number(decoded.token_version) !== Number(user.token_version)) {
            return reject(res, 401, "Token has been revoked");
        }

        if (Number(user.status) !== 1) {
            return reject(res, 403, "User account is not active");
        }

        if (user.company_id && Number(user.company_status) !== 1) {
            return reject(res, 403, "Company is not active");
        }

        req.token = token;
        req.tokenPayload = decoded;
        req.user = {
            id: user.id,
            company_id: user.company_id,
            user_type: user.user_type,
            email: user.email,
            mobile: user.mobile,
            name: user.name,
            jti: decoded.jti,
            token_version: user.token_version
        };

        if (isSuperAdmin(req.user)) {
            const requestedCompanyId = readRequestedCompanyId(req);

            if (Number.isNaN(requestedCompanyId)) {
                return res.status(400).json({
                    success: false,
                    message: "Company ID must be a positive integer"
                });
            }

            if (requestedCompanyId !== null) {
                const [rows] = await db.execute(
                    `SELECT id, name, status
                     FROM companies
                     WHERE id = ? AND status = 1
                     LIMIT 1`,
                    [requestedCompanyId]
                );

                if (!rows[0]) {
                    return res.status(400).json({
                        success: false,
                        message: "Select an active company"
                    });
                }

                req.user.company_id = rows[0].id;
                req.company = rows[0];
            }
        }

        return next();
    } catch (error) {
        return sendError(res, error);
    }
};

module.exports = authMiddleware;
