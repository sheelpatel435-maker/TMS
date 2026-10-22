const jwt = require("jsonwebtoken");
const userModel = require("../models/userModel");
const revokedTokenModel = require("../models/revokedTokenModel");

const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: "Authorization token is required"
            });
        }

        const token = authHeader.startsWith("Bearer ")
            ? authHeader.split(" ")[1]
            : authHeader;

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (await revokedTokenModel.isRevoked(decoded.jti)) {
            return res.status(401).json({
                success: false,
                message: "Token has been revoked"
            });
        }

        const userId = decoded.id || decoded.user_id;
        const user = await userModel.findUserById(userId);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired token"
            });
        }

        if (user.status !== 1) {
            return res.status(403).json({
                success: false,
                message: "User account is not active"
            });
        }

        if (
            decoded.token_version !== undefined &&
            Number(decoded.token_version) !== Number(user.token_version)
        ) {
            return res.status(401).json({
                success: false,
                message: "Token has been revoked"
            });
        }

        req.token = token;
        req.tokenPayload = decoded;
        req.user = {
            id: user.id,
            company_id: user.company_id,
            user_type: user.user_type,
            email: user.email,
            name: user.name,
            jti: decoded.jti,
            token_version: user.token_version
        };

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token"
        });
    }
};

module.exports = authMiddleware;
