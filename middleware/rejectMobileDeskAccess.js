const MOBILE_TYPES = new Set(["DRIVER", "HELPER"]);

/** Driver/Helper may use /api/mobile + auth only — not Admin Web modules. */
const rejectMobileDeskAccess = (req, res, next) => {
    if (MOBILE_TYPES.has(req.user?.user_type)) {
        return res.status(403).json({
            success: false,
            message: "Driver/Helper cannot access Admin Web modules"
        });
    }
    return next();
};

module.exports = rejectMobileDeskAccess;
