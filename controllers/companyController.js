const companyModel = require("../models/companyModel");
const userModel = require("../models/userModel");
const { sendError, HttpError } = require("../utils/httpError");
const { isSuperAdmin } = require("../utils/roles");
const { createSession } = require("./authController");

const listCompanies = async (req, res) => {
    try {
        if (!req.user) {
            const companies = await companyModel.listActive();

            return res.status(200).json({
                success: true,
                companies
            });
        }

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
        const name = String(req.body.name || "").trim();

        if (!name) {
            throw new HttpError(400, "Company name is required");
        }

        if (!isSuperAdmin(req.user) && req.user.company_id) {
            throw new HttpError(403, "You are already assigned to a company");
        }

        const existing = await companyModel.findByName(name);

        if (existing) {
            throw new HttpError(409, "Company already exists");
        }

        const companyId = await companyModel.createCompany(name);
        const company = await companyModel.getById(companyId);
        const payload = {
            success: true,
            message: "Company created successfully",
            company
        };

        if (!isSuperAdmin(req.user)) {
            await userModel.assignCompanyAdmin(req.user.id, companyId);
            const user = await userModel.findUserById(req.user.id);
            Object.assign(payload, createSession(user));
        }

        return res.status(201).json(payload);
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
