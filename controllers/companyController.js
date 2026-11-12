const bcrypt = require("bcryptjs");
const companyModel = require("../models/companyModel");
const userModel = require("../models/userModel");
const { sendError, HttpError } = require("../utils/httpError");
const { isSuperAdmin } = require("../utils/roles");
const { assertStrongPassword, BCRYPT_ROUNDS } = require("../utils/password");
const {
    requireValidMobile,
    requireValidEmail
} = require("../utils/userValidation");
const { withTransaction } = require("../utils/transaction");
const { isMissing } = require("../utils/validation");

const listCompanies = async (req, res) => {
    try {
        if (isSuperAdmin(req.user)) {
            const companies = await companyModel.listAll();

            return res.status(200).json({
                success: true,
                companies
            });
        }

        if (!req.user.company_id) {
            return res.status(200).json({
                success: true,
                companies: []
            });
        }

        const company = await companyModel.getById(req.user.company_id);

        return res.status(200).json({
            success: true,
            companies: company ? [company] : []
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const getCompany = async (req, res) => {
    try {
        const company = await companyModel.getById(req.params.id);

        if (!company) {
            throw new HttpError(404, "Company not found");
        }

        if (
            !isSuperAdmin(req.user) &&
            Number(req.user.company_id) !== Number(company.id)
        ) {
            throw new HttpError(403, "Access denied");
        }

        return res.status(200).json({
            success: true,
            company
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const createCompany = async (req, res) => {
    try {
        assertSuperAdmin(req);

        const name = String(req.body.name || "").trim();
        const adminName = String(req.body.admin_name || "").trim();
        const adminMobile = req.body.admin_mobile;
        const adminEmail = req.body.admin_email;
        const adminPassword = req.body.admin_password;

        if (!name) {
            throw new HttpError(400, "Company name is required");
        }

        if (
            isMissing(adminName) ||
            isMissing(adminMobile) ||
            isMissing(adminPassword)
        ) {
            throw new HttpError(
                400,
                "admin_name, admin_mobile and admin_password are required to create Company Admin"
            );
        }

        assertStrongPassword(adminPassword);
        const mobile = requireValidMobile(adminMobile);
        const email = requireValidEmail(adminEmail);

        const existing = await companyModel.findByName(name);

        if (existing) {
            throw new HttpError(409, "Company already exists");
        }

        if (await userModel.findDuplicateContact(mobile, email)) {
            throw new HttpError(409, "Admin mobile or email is already registered");
        }

        const { company, adminId } = await withTransaction(async (connection) => {
            const companyId = await companyModel.createCompany(name, connection);
            const passwordHash = await bcrypt.hash(adminPassword, BCRYPT_ROUNDS);
            const userId = await userModel.createUser(
                {
                    company_id: companyId,
                    user_type: "COMPANY_ADMIN",
                    name: adminName,
                    mobile,
                    email,
                    password_hash: passwordHash
                },
                connection
            );

            return {
                company: await companyModel.getById(companyId, connection),
                adminId: userId
            };
        });

        return res.status(201).json({
            success: true,
            message: "Company and Company Admin created successfully",
            company,
            admin_user_id: adminId
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const updateCompany = async (req, res) => {
    try {
        assertSuperAdmin(req);

        const name = String(req.body.name || "").trim();
        const status = Number(req.body.status);

        if (!name) {
            throw new HttpError(400, "Company name is required");
        }

        if (status !== 0 && status !== 1) {
            throw new HttpError(400, "Status must be 0 or 1");
        }

        const company = await companyModel.getById(req.params.id);

        if (!company) {
            throw new HttpError(404, "Company not found");
        }

        const duplicate = await companyModel.findByName(name);

        if (duplicate && Number(duplicate.id) !== Number(company.id)) {
            throw new HttpError(409, "Company already exists");
        }

        await companyModel.updateCompany(company.id, { name, status });

        return res.status(200).json({
            success: true,
            message: "Company updated successfully",
            company: await companyModel.getById(company.id)
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const deactivateCompany = async (req, res) => {
    try {
        assertSuperAdmin(req);

        const company = await companyModel.getById(req.params.id);

        if (!company) {
            throw new HttpError(404, "Company not found");
        }

        if (Number(company.status) !== 1) {
            return res.status(200).json({
                success: true,
                message: "Company already inactive"
            });
        }

        await companyModel.deactivateCompany(company.id);

        return res.status(200).json({
            success: true,
            message: "Company deactivated successfully"
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const assertSuperAdmin = (req) => {
    if (!isSuperAdmin(req.user)) {
        throw new HttpError(403, "Super admin access is required");
    }
};

module.exports = {
    listCompanies,
    getCompany,
    createCompany,
    updateCompany,
    deactivateCompany
};
