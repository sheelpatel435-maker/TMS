const { HttpError, sendError } = require("../utils/httpError");
const { positiveInteger } = require("../utils/vehicleValidation");

const MOBILE_TYPES = new Set(["DRIVER", "HELPER"]);

const requireAdminVehicleUser = (req, res, next) => {
    if (MOBILE_TYPES.has(req.user?.user_type)) {
        return res.status(403).json({
            success: false,
            message: "Mobile users cannot access Admin Web vehicle APIs"
        });
    }
    return next();
};

const requireMobileVehicleUser = (req, res, next) => {
    if (!MOBILE_TYPES.has(req.user?.user_type)) {
        return res.status(403).json({
            success: false,
            message: "This endpoint is only for Driver or Helper mobile users"
        });
    }
    return next();
};

const requireVehicleId = (req, res, next) => {
    try {
        req.validatedVehicleId = positiveInteger(
            req.params.id ?? req.params.vehicleId,
            "id"
        );
        return next();
    } catch (error) {
        return sendError(res, error);
    }
};

module.exports = {
    requireAdminVehicleUser,
    requireMobileVehicleUser,
    requireVehicleId
};
