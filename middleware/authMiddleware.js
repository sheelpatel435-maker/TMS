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
            return reject(res, 401, "User account is not active");
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
            token_version: user.token_version,
            active_company_id: null
        };

        // Tenant comes only from signed session claims — never from client body/query/headers.
        if (isSuperAdmin(req.user)) {
            const activeCompanyId = Number(decoded.active_company_id);
            if (
                Number.isSafeInteger(activeCompanyId) &&
                activeCompanyId > 0
            ) {
                const [rows] = await db.execute(
                    `SELECT id, name, status
                     FROM companies
                     WHERE id = ? AND status = 1
                     LIMIT 1`,
                    [activeCompanyId]
                );

                if (!rows[0]) {
                    return reject(res, 400, "Selected company is not active");
                }

                req.user.company_id = rows[0].id;
                req.user.active_company_id = rows[0].id;
                req.company = rows[0];
            }
        }

        return next();
    } catch (error) {
        return sendError(res, error);
    }
};

module.exports = authMiddleware;
