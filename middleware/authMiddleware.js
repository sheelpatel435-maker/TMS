

const jwt = require("jsonwebtoken");
const userModel = require("../models/userModel");
const revokedTokenModel = require("../models/revokedTokenModel");

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

        // Company deactivate hone par uske saare users turant block
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

        // Super admin has no fixed company — apply selected desk from X-Company-Id.
        if (isSuperAdmin(req.user)) {
            const requestedCompanyId = readRequestedCompanyId(req);

            if (Number.isNaN(requestedCompanyId)) {
                return res.status(400).json({
                    success: false,
                    message: "Company ID is required"
                });
            }

            if (requestedCompanyId) {
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