const userModuleAccessModel = require("../models/userModuleAccessModel");
const moduleModel = require("../models/moduleModel");
const { parsePagination } = require("../utils/pagination");
const { sendError, HttpError } = require("../utils/httpError");
const { isMissing } = require("../utils/validation");
const { isAdmin, isSuperAdmin } = require("../utils/roles");
const { assertOwnedUser, getById } = require("../utils/companyScope");

const canManageUser = (actor, targetUserId) => {
    if (Number(actor.id) === Number(targetUserId)) {
        return true;
    }

    return isAdmin(actor);
};

const getUserAccess = async (req, res) => {
    try {
        const requestedUserId = req.params.userId || req.user.id;

        if (!canManageUser(req.user, requestedUserId)) {
            throw new HttpError(403, "You cannot view this user's access");
        }

        if (Number(requestedUserId) !== Number(req.user.id)) {
            if (isSuperAdmin(req.user)) {
                const target = await getById("users", requestedUserId);

                if (!target) {
                    throw new HttpError(400, "User not found");
                }
            } else {
                await assertOwnedUser(requestedUserId, req.user.company_id);
            }
        }

        const { rows: access, pagination } =
            await userModuleAccessModel.getUserAccess(
                requestedUserId,
                parsePagination(req.query)
            );

        return res.status(200).json({
            success: true,
            access,
            pagination
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const createUserAccess = async (req, res) => {
    try {
        if (!isAdmin(req.user)) {
            throw new HttpError(403, "Admin access is required");
        }

        const {
            user_id,
            module_id,
            can_view,
            can_create,
            can_update,
            can_delete,
            can_approve,
            can_export,
            can_dispatch,
            can_close
        } = req.body;

        if (isMissing(user_id) || isMissing(module_id)) {
            throw new HttpError(400, "user_id and module_id are required");
        }

        if (isSuperAdmin(req.user)) {
            const target = await getById("users", user_id);

            if (!target) {
                throw new HttpError(400, "User not found");
            }
        } else {
            await assertOwnedUser(user_id, req.user.company_id);
        }

        const moduleRow = await moduleModel.getModuleById(module_id);

        if (!moduleRow) {
            throw new HttpError(400, "Module not found");
        }

        const accessId = await userModuleAccessModel.createUserAccess({
            user_id,
            module_id,
            can_view,
            can_create,
            can_update,
            can_delete,
            can_approve,
            can_export,
            can_dispatch,
            can_close
        });

        return res.status(201).json({
            success: true,
            message: "User module access saved successfully",
            access_id: accessId
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const deleteUserAccess = async (req, res) => {
    try {
        if (!isAdmin(req.user)) {
            throw new HttpError(403, "Admin access is required");
        }

        const accessId = req.params.id;
        const existing = await userModuleAccessModel.getUserAccessById(accessId);

        if (!existing) {
            throw new HttpError(404, "Access record not found");
        }

        if (isSuperAdmin(req.user)) {
            const target = await getById("users", existing.user_id);

            if (!target) {
                throw new HttpError(400, "User not found");
            }
        } else {
            await assertOwnedUser(existing.user_id, req.user.company_id);
        }

        await userModuleAccessModel.deleteUserAccess(existing.id);

        return res.status(200).json({
            success: true,
            message: "User module access revoked successfully"
        });
    } catch (error) {
        return sendError(res, error);
    }
};

module.exports = {
    getUserAccess,
    createUserAccess,
    deleteUserAccess
};
