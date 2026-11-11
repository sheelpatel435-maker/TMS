const userModuleAccessModel = require("../models/userModuleAccessModel");
const moduleModel = require("../models/moduleModel");
const userModel = require("../models/userModel");
const { parsePagination } = require("../utils/pagination");
const { sendError, HttpError } = require("../utils/httpError");
const { assertCanManageUser } = require("../utils/roles");
const { MODULE_ACTIONS, normalizeModuleName } = require("../utils/moduleActions");
const { writeAudit } = require("../utils/audit");

const ACCESS_FLAGS = [
    "can_view",
    "can_create",
    "can_update",
    "can_delete",
    "can_approve",
    "can_export",
    "can_dispatch",
    "can_close"
];

const ACCESS_BITS = {
    can_view: 1,
    can_create: 2,
    can_update: 4,
    can_delete: 8,
    can_approve: 16,
    can_export: 32,
    can_dispatch: 64,
    can_close: 128
};

const getTargetUser = async (req, userId) => {
    const user = await userModel.findUserById(userId);

    if (!user) {
        throw new HttpError(404, "User not found");
    }

    assertCanManageUser(req.user, user);
    return user;
};

const validateModuleChecklist = async (modules) => {
    if (!Array.isArray(modules)) {
        throw new HttpError(400, "modules must be an array");
    }

    const seenModuleIds = new Set();
    const validated = [];

    for (const entry of modules) {
        if (
            !entry ||
            !/^\d+$/.test(String(entry.module_id || "")) ||
            !Number.isSafeInteger(Number(entry.module_id)) ||
            Number(entry.module_id) < 1 ||
            !Array.isArray(entry.actions)
        ) {
            throw new HttpError(
                400,
                "Each module must include a valid module_id and actions array"
            );
        }

        const moduleId = Number(entry.module_id);
        if (seenModuleIds.has(moduleId)) {
            throw new HttpError(400, "A module can appear only once in the checklist");
        }
        seenModuleIds.add(moduleId);

        const module = await moduleModel.getModuleById(moduleId);
        if (!module || Number(module.status) !== 1) {
            throw new HttpError(400, "Unknown or inactive module");
        }

        const moduleName = normalizeModuleName(module.name);
        const allowedActions = MODULE_ACTIONS[moduleName];
        if (!allowedActions) {
            throw new HttpError(400, "Unknown module");
        }

        const seenActions = new Set();
        for (const action of entry.actions) {
            if (
                typeof action !== "string" ||
                !allowedActions.includes(action) ||
                !ACCESS_FLAGS.includes(action) ||
                seenActions.has(action)
            ) {
                throw new HttpError(
                    400,
                    `Action is not allowed for module ${module.name}`
                );
            }
            seenActions.add(action);
        }

        validated.push({
            module_id: moduleId,
            actions: [...seenActions]
        });
    }

    return validated;
};

const accessForAudit = (rows) =>
    Object.fromEntries(
        rows.map((row) => [
            row.module_id,
            ACCESS_FLAGS.reduce(
                (mask, action) =>
                    Number(row[action]) === 1 ? mask | ACCESS_BITS[action] : mask,
                0
            )
        ])
    );

const getUserAccess = async (req, res) => {
    try {
        const requestedUserId = req.params.userId;
        await getTargetUser(req, requestedUserId);

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

const replaceUserAccess = async (req, res) => {
    try {
        if (Object.keys(req.body || {}).some((key) => key !== "modules")) {
            throw new HttpError(400, "Only the modules checklist is accepted");
        }

        const user = await getTargetUser(req, req.params.userId);
        const modules = await validateModuleChecklist(req.body?.modules);
        const { oldAccess, newAccess } =
            await userModuleAccessModel.replaceUserAccess(user.id, modules);

        await writeAudit(
            req,
            "ACCESS_UPDATE",
            "user",
            user.id,
            JSON.stringify({
                action_bits:
                    "view=1,create=2,update=4,delete=8,approve=16,export=32,dispatch=64,close=128",
                old: accessForAudit(oldAccess),
                new: accessForAudit(newAccess)
            })
        );

        return res.status(200).json({
            success: true,
            message: "User module access saved successfully",
            access: newAccess
        });
    } catch (error) {
        return sendError(res, error);
    }
};

module.exports = {
    getUserAccess,
    replaceUserAccess,
    validateModuleChecklist
};
