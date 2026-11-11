const { HttpError } = require("./httpError");

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
    if (!req.user?.company_id) {
        return res.status(400).json({
            success: false,
            message: "Company ID is required"
        });
    }

    next();
};

const assertCanManageUser = (
    reqUser,
    targetUser,
    {
        allowSelfProfileEdit = false,
        allowSuperAdminCompanyAdminStatus = false
    } = {}
) => {
    const isSelf = Number(reqUser?.id) === Number(targetUser?.id);

    if (isSelf && !allowSelfProfileEdit) {
        throw new HttpError(403, "You cannot manage your own account");
    }

    if (!isAdmin(reqUser)) {
        throw new HttpError(403, "Admin access is required");
    }

    if (!isSelf && Number(reqUser.company_id) !== Number(targetUser.company_id)) {
        throw new HttpError(404, "User not found");
    }

    const canManageCompanyAdminStatus =
        allowSuperAdminCompanyAdminStatus &&
        isSuperAdmin(reqUser) &&
        targetUser.user_type === "COMPANY_ADMIN";

    if (
        !isSelf &&
        targetUser.user_type !== "COMPANY_USER" &&
        !canManageCompanyAdminStatus
    ) {
        throw new HttpError(403, "Only COMPANY_USER accounts can be managed");
    }
};

module.exports = {
    ADMIN_TYPES,
    isSuperAdmin,
    isAdmin,
    requireAdmin,
    requireCompanyContext,
    assertCanManageUser
};
