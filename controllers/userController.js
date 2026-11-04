const bcrypt = require("bcryptjs");
const userModel = require("../models/userModel");
const companyModel = require("../models/companyModel");
const { parsePagination } = require("../utils/pagination");
const { sendError, HttpError } = require("../utils/httpError");
const { isMissing } = require("../utils/validation");
const { isAdmin, isSuperAdmin } = require("../utils/roles");
const { writeAudit } = require("../utils/audit");
const { assertStrongPassword, BCRYPT_ROUNDS } = require("../utils/password");

const ALLOWED_TYPES = [
    "SUPER_ADMIN",
    "COMPANY_ADMIN",
    "COMPANY_USER",
    "DRIVER",
    "HELPER"
];

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

const assertCanManage = (actor, target) => {
    if (isSuperAdmin(actor)) {
        return;
    }

    if (!isAdmin(actor)) {
        throw new HttpError(403, "Admin access is required");
    }

    if (Number(target.company_id) !== Number(actor.company_id)) {
        throw new HttpError(403, "User does not belong to this company");
    }

    if (target.user_type === "SUPER_ADMIN") {
        throw new HttpError(403, "Cannot manage super admin users");
    }
};

const normalizeType = (value, actor) => {
    const type = String(value || "COMPANY_USER").trim().toUpperCase();

    if (!ALLOWED_TYPES.includes(type)) {
        throw new HttpError(400, "Invalid user_type");
    }

    if (!isSuperAdmin(actor) && type === "SUPER_ADMIN") {
        throw new HttpError(403, "Only super admin can create SUPER_ADMIN");
    }

    return type;
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

        assertCanManage(req.user, user);

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

        const name = String(req.body.name || "").trim();
        const mobile = String(req.body.mobile || "").trim();
        const email = String(req.body.email || "").trim().toLowerCase();
        const password = req.body.password;
        const userType = normalizeType(req.body.user_type, req.user);

        if (isMissing(name) || isMissing(mobile) || isMissing(password)) {
            throw new HttpError(400, "Name, mobile and password are required");
        }

        assertStrongPassword(password);

        let companyId = req.body.company_id;

        if (isSuperAdmin(req.user)) {
            if (userType !== "SUPER_ADMIN" && isMissing(companyId)) {
                throw new HttpError(400, "company_id is required");
            }
        } else {
            companyId = req.user.company_id;

            if (!companyId) {
                throw new HttpError(400, "User is not assigned to a company");
            }
        }

        if (companyId) {
            const company = await companyModel.getById(companyId);

            if (!company || Number(company.status) !== 1) {
                throw new HttpError(400, "Company not found");
            }
        }

        if (email) {
            const existing = await userModel.findUserByEmail(email);

            if (existing) {
                throw new HttpError(409, "Email is already registered");
            }
        }

        const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
        const id = await userModel.createUser({
            company_id: companyId || null,
            user_type: userType,
            name,
            mobile,
            email: email || null,
            password_hash: passwordHash,
            status: req.body.status
        });

        await writeAudit(req, "USER_CREATED", "user", id);

        return res.status(201).json({
            success: true,
            message: "User created successfully",
            id,
            user: publicUser(await userModel.findUserById(id))
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const updateUser = async (req, res) => {
    try {
        if (!isAdmin(req.user)) {
            throw new HttpError(403, "Admin access is required");
        }

        const existing = await userModel.findUserById(req.params.id);

        if (!existing) {
            throw new HttpError(404, "User not found");
        }

        assertCanManage(req.user, existing);

        const name = String(req.body.name || existing.name).trim();
        const mobile = String(req.body.mobile || existing.mobile).trim();
        const email = String(
            req.body.email !== undefined ? req.body.email : existing.email || ""
        )
            .trim()
            .toLowerCase();
        const userType = normalizeType(
            req.body.user_type || existing.user_type,
            req.user
        );

        let companyId = existing.company_id;

        if (isSuperAdmin(req.user) && req.body.company_id !== undefined) {
            companyId = req.body.company_id;
        }

        if (email && email !== existing.email) {
            const duplicate = await userModel.findUserByEmail(email);

            if (duplicate && Number(duplicate.id) !== Number(existing.id)) {
                throw new HttpError(409, "Email is already registered");
            }
        }

        let passwordHash = null;

        if (req.body.password) {
            assertStrongPassword(req.body.password);
            passwordHash = await bcrypt.hash(req.body.password, BCRYPT_ROUNDS);
        }

        await userModel.updateUser(existing.id, {
            company_id: companyId,
            user_type: userType,
            name,
            mobile,
            email: email || null,
            status: req.body.status !== undefined ? req.body.status : existing.status,
            password_hash: passwordHash
        });

        if (passwordHash) {
            await userModel.bumpTokenVersion(existing.id);
        }

        await writeAudit(req, "USER_UPDATED", "user", existing.id);

        return res.status(200).json({
            success: true,
            message: "User updated successfully",
            user: publicUser(await userModel.findUserById(existing.id))
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const deactivateUser = async (req, res) => {
    try {
        if (!isAdmin(req.user)) {
            throw new HttpError(403, "Admin access is required");
        }

        const existing = await userModel.findUserById(req.params.id);

        if (!existing) {
            throw new HttpError(404, "User not found");
        }

        assertCanManage(req.user, existing);

        if (Number(existing.id) === Number(req.user.id)) {
            throw new HttpError(400, "You cannot deactivate your own account");
        }

        if (Number(existing.status) !== 1) {
            return res.status(200).json({
                success: true,
                message: "User already inactive"
            });
        }

        await userModel.deactivateUser(existing.id);
        await writeAudit(req, "USER_DEACTIVATED", "user", existing.id);

        return res.status(200).json({
            success: true,
            message: "User deactivated successfully"
        });
    } catch (error) {
        return sendError(res, error);
    }
};

module.exports = {
    getUsers,
    getUserById,
    createUser,
    updateUser,
    deactivateUser
};
