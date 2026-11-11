const bcrypt = require("bcryptjs");
const userModel = require("../models/userModel");
const companyModel = require("../models/companyModel");
const { parsePagination } = require("../utils/pagination");
const { sendError, HttpError } = require("../utils/httpError");
const { isMissing } = require("../utils/validation");
const { isAdmin, isSuperAdmin, assertCanManageUser } = require("../utils/roles");
const { writeAudit } = require("../utils/audit");
const { assertStrongPassword, BCRYPT_ROUNDS } = require("../utils/password");
const {
    requireValidMobile,
    requireValidEmail
} = require("../utils/userValidation");

const publicUser = (user) => ({
    id: user.id,
    company_id: user.company_id,
    user_type: user.user_type,
    name: user.name,
    mobile: user.mobile,
    email: user.email,
    status: user.status,
    last_login_at: user.last_login_at || null,
    created_at: user.created_at,
    updated_at: user.updated_at
});

const resolveListCompanyId = (req) => {
    if (isSuperAdmin(req.user)) {
        if (req.query.company_id) {
            return Number(req.query.company_id);
        }

        return null;
    }

    if (!req.user.company_id) {
        throw new HttpError(400, "User is not assigned to a company");
    }

    return req.user.company_id;
};

const auditUser = (user) => ({
    id: user.id,
    company_id: user.company_id,
    user_type: user.user_type,
    name: user.name,
    mobile: user.mobile,
    email: user.email,
    status: user.status
});

const rejectDuplicateContact = (res, error) => {
    if (error?.code === "ER_DUP_ENTRY") {
        return res.status(409).json({
            success: false,
            message: "Mobile number or email is already registered"
        });
    }

    return sendError(res, error);
};

const getUsers = async (req, res) => {
    try {
        if (!isAdmin(req.user)) {
            throw new HttpError(403, "Admin access is required");
        }

        const companyId = resolveListCompanyId(req);
        const { rows: users, pagination } = await userModel.getUsers(
            companyId,
            parsePagination(req.query),
            {
                search: req.query.search,
                status: req.query.status,
                user_type: req.query.user_type
            }
        );

        return res.status(200).json({
            success: true,
            users: users.map(publicUser),
            pagination
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const getUserById = async (req, res) => {
    try {
        if (!isAdmin(req.user)) {
            throw new HttpError(403, "Admin access is required");
        }

        const user = await userModel.findUserById(req.params.id);

        if (!user) {
            throw new HttpError(404, "User not found");
        }

        if (
            !isSuperAdmin(req.user) &&
            Number(user.company_id) !== Number(req.user.company_id)
        ) {
            throw new HttpError(404, "User not found");
        }

        return res.status(200).json({
            success: true,
            user: publicUser(user)
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const createUser = async (req, res) => {
    try {
        if (!isAdmin(req.user)) {
            throw new HttpError(403, "Admin access is required");
        }

        const body = req.body || {};
        if (
            Object.prototype.hasOwnProperty.call(body, "user_type") &&
            body.user_type !== "COMPANY_USER"
        ) {
            throw new HttpError(400, "Only COMPANY_USER accounts can be created");
        }

        const name = String(body.name || "").trim();
        const mobile = requireValidMobile(body.mobile);
        const email = requireValidEmail(body.email);
        const password = body.password;

        if (isMissing(name) || typeof password !== "string" || !password) {
            throw new HttpError(400, "Name, mobile and password are required");
        }

        assertStrongPassword(password);

        const companyId = req.user.company_id;
        if (!companyId) {
            throw new HttpError(400, "User is not assigned to a company");
        }

        const company = await companyModel.getById(companyId);

        if (!company || Number(company.status) !== 1) {
            throw new HttpError(400, "Company not found");
        }

        if (await userModel.findDuplicateContact(mobile, email)) {
            throw new HttpError(409, "Mobile number or email is already registered");
        }

        const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
        const id = await userModel.createUser({
            company_id: companyId,
            name,
            mobile,
            email,
            password_hash: passwordHash
        });

        const created = await userModel.findUserById(id);
        await writeAudit(
            req,
            "USER_CREATE",
            "user",
            id,
            JSON.stringify({ new: auditUser(created) })
        );

        return res.status(201).json({
            success: true,
            message: "User created successfully",
            id,
            user: publicUser(created)
        });
    } catch (error) {
        return rejectDuplicateContact(res, error);
    }
};

const updateUser = async (req, res) => {
    try {
        if (!isAdmin(req.user)) {
            throw new HttpError(403, "Admin access is required");
        }

        const body = req.body || {};
        const forbiddenFields = ["user_type", "company_id", "status"];
        if (forbiddenFields.some((field) => Object.hasOwn(body, field))) {
            throw new HttpError(400, "user_type, company_id, and status cannot be changed here");
        }

        const allowedFields = ["name", "mobile", "email", "password"];
        const unknownFields = Object.keys(body).filter(
            (field) => !allowedFields.includes(field)
        );
        if (unknownFields.length > 0) {
            throw new HttpError(400, "Request contains unsupported user fields");
        }

        const existing = await userModel.findUserById(req.params.id);

        if (!existing) {
            throw new HttpError(404, "User not found");
        }

        const isSelf = Number(existing.id) === Number(req.user.id);
        assertCanManageUser(req.user, existing, {
            allowSelfProfileEdit:
                isSelf &&
                Object.keys(body).every((field) =>
                    ["name", "password"].includes(field)
                )
        });

        if (isSelf && Object.keys(body).some((field) => ["mobile", "email"].includes(field))) {
            throw new HttpError(400, "You can only change your own name and password");
        }

        if (Object.keys(body).length === 0) {
            throw new HttpError(400, "At least one editable field is required");
        }

        const updates = {};

        if (Object.prototype.hasOwnProperty.call(body, "name")) {
            updates.name = String(body.name || "").trim();
            if (!updates.name) {
                throw new HttpError(400, "Name is required");
            }
        }

        if (Object.prototype.hasOwnProperty.call(body, "mobile")) {
            updates.mobile = requireValidMobile(body.mobile);
        }

        if (Object.prototype.hasOwnProperty.call(body, "email")) {
            updates.email = requireValidEmail(body.email);
        }

        if (updates.mobile !== undefined || updates.email !== undefined) {
            const mobile = updates.mobile ?? existing.mobile;
            const email = updates.email !== undefined ? updates.email : existing.email;
            if (
                await userModel.findDuplicateContact(
                    mobile,
                    email,
                    existing.id
                )
            ) {
                throw new HttpError(409, "Mobile number or email is already registered");
            }
        }

        if (Object.prototype.hasOwnProperty.call(body, "password")) {
            if (typeof body.password !== "string" || !body.password) {
                throw new HttpError(400, "A valid password is required");
            }
            assertStrongPassword(body.password);
            updates.password_hash = await bcrypt.hash(
                body.password,
                BCRYPT_ROUNDS
            );
        }

        await userModel.updateUser(existing.id, updates);

        const updated = await userModel.findUserById(existing.id);
        await writeAudit(
            req,
            "USER_UPDATE",
            "user",
            existing.id,
            JSON.stringify({
                old: auditUser(existing),
                new: auditUser(updated)
            })
        );

        return res.status(200).json({
            success: true,
            message: "User updated successfully",
            user: publicUser(updated)
        });
    } catch (error) {
        return rejectDuplicateContact(res, error);
    }
};

const updateUserStatus = async (req, res, status) => {
    try {
        if (!isAdmin(req.user)) {
            throw new HttpError(403, "Admin access is required");
        }

        if (status !== 0 && status !== 1) {
            throw new HttpError(400, "Status must be 0 or 1");
        }

        const existing = await userModel.findUserById(req.params.id);

        if (!existing) {
            throw new HttpError(404, "User not found");
        }

        assertCanManageUser(req.user, existing);

        if (Number(existing.status) === status) {
            return res.status(200).json({
                success: true,
                message: status === 1 ? "User already active" : "User already inactive",
                user: publicUser(existing)
            });
        }

        await userModel.setUserStatus(existing.id, status);
        const updated = await userModel.findUserById(existing.id);
        await writeAudit(
            req,
            status === 0 ? "USER_DEACTIVATE" : "USER_ACTIVATE",
            "user",
            existing.id,
            JSON.stringify({
                old: auditUser(existing),
                new: auditUser(updated)
            })
        );

        return res.status(200).json({
            success: true,
            message: status === 0 ? "User deactivated successfully" : "User activated successfully",
            user: publicUser(updated)
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const deactivateUser = (req, res) => updateUserStatus(req, res, 0);

const setUserStatus = (req, res) => {
    const bodyFields = Object.keys(req.body || {});
    if (bodyFields.some((field) => field !== "status")) {
        return res.status(400).json({
            success: false,
            message: "Only status can be changed on this endpoint"
        });
    }

    const rawStatus = req.body?.status;
    const status =
        rawStatus === 0 || rawStatus === "0"
            ? 0
            : rawStatus === 1 || rawStatus === "1"
              ? 1
              : NaN;
    if (status !== 0 && status !== 1) {
        return res.status(400).json({
            success: false,
            message: "Status must be 0 or 1"
        });
    }

    return updateUserStatus(req, res, status);
};

module.exports = {
    getUsers,
    getUserById,
    createUser,
    updateUser,
    deactivateUser,
    setUserStatus
};
