const ADMIN_TYPES = ["SUPER_ADMIN", "COMPANY_ADMIN"];

const isSuperAdmin = (user) => user?.user_type === "SUPER_ADMIN";

const isAdmin = (user) => ADMIN_TYPES.includes(user?.user_type);

const requireAdmin = (req, res, next) => {
    if (!isAdmin(req.user)) {
        return res.status(403).json({
            success: false,
            message: "Admin access is required"
        });
    }

    next();
};

const requireCompanyContext = (req, res, next) => {
    if (isSuperAdmin(req.user)) {
        return next();
    }

    if (!req.user?.company_id) {
        return res.status(400).json({
            success: false,
            message: "User is not assigned to a company"
        });
    }

    next();
};

module.exports = {
    ADMIN_TYPES,
    isSuperAdmin,
    isAdmin,
    requireAdmin,
    requireCompanyContext
};
