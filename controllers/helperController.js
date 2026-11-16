const helperModel = require("../models/helperModel");
const helperDocumentModel = require("../models/helperDocumentModel");
const { parsePagination } = require("../utils/pagination");
const { sendError, HttpError } = require("../utils/httpError");
const { firstPresent, isMissing } = require("../utils/validation");
const { resolveCompanyId } = require("../utils/companyScope");
const { writeAudit } = require("../utils/audit");
const { withTransaction } = require("../utils/transaction");
const { createStaffLoginUser } = require("../utils/staffAccount");
const { requireValidMobile } = require("../utils/userValidation");

const getHelperFilters = (query) => {
    const filters = {};

    if (query.search) {
        filters.search = String(query.search).trim();
    }

    if (query.status !== undefined && query.status !== "") {
        filters.status = query.status;
    }

    if (query.availability_status) {
        filters.availability_status = String(query.availability_status).trim();
    }

    return filters;
};

const getHelpers = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const { rows: helpers, pagination } = await helperModel.getHelpers(
            companyId,
            parsePagination(req.query),
            getHelperFilters(req.query)
        );

        return res.status(200).json({
            success: true,
            helpers,
            pagination
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const getHelperById = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const helper = await helperModel.getHelperById(req.params.id, companyId);

        if (!helper) {
            throw new HttpError(404, "Helper not found");
        }

        return res.status(200).json({
            success: true,
            helper
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const createHelper = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const name = firstPresent(req.body.name, req.body.full_name);
        const {
            mobile,
            password,
            document_type,
            document_number,
            document_url,
            issue_date,
            expiry_date
        } = req.body;

        if (isMissing(name)) {
            throw new HttpError(400, "Helper name is required");
        }

        if (isMissing(mobile)) {
            throw new HttpError(400, "Mobile number is required");
        }

        if (isMissing(password)) {
            throw new HttpError(
                400,
                "Initial password is required for helper mobile login"
            );
        }

        const cleanMobile = requireValidMobile(mobile);

        const existing = await helperModel.findHelperByMobile(companyId, cleanMobile);
        if (existing) {
            throw new HttpError(409, "Helper with this mobile number already exists");
        }

        const { id, userId } = await withTransaction(async (connection) => {
            const login = await createStaffLoginUser({
                companyId,
                userType: "HELPER",
                name,
                mobile: cleanMobile,
                email: req.body.email,
                password,
                connection
            });

            const helperId = await helperModel.createHelper(
                companyId,
                {
                    ...req.body,
                    name,
                    mobile: cleanMobile,
                    user_id: login.userId,
                    availability_status: "AVAILABLE"
                },
                connection
            );

            return { id: helperId, userId: login.userId };
        });

        await writeAudit(req, "HELPER_CREATED", "helper", id);

        // Admin-created docs are trusted — no separate verification step
        if (!isMissing(document_type) || !isMissing(document_number)) {
            await helperDocumentModel.createHelperDocument(companyId, id, {
                document_type: document_type || "ID_PROOF",
                document_number: document_number || null,
                document_url: document_url || null,
                issue_date: issue_date || null,
                expiry_date: expiry_date || null,
                status: 1
            });
        }

        return res.status(201).json({
            success: true,
            message: "Helper created successfully with mobile login",
            id,
            user_id: userId
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const updateHelper = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const existing = await helperModel.getHelperById(req.params.id, companyId);

        if (!existing) {
            throw new HttpError(404, "Helper not found");
        }

        const name = firstPresent(req.body.name, req.body.full_name, existing.name);
        const mobile = req.body.mobile ?? existing.mobile;

        if (isMissing(name) || isMissing(mobile)) {
            throw new HttpError(400, "Helper name and mobile are required");
        }

        const cleanMobile = requireValidMobile(mobile);
        const duplicate = await helperModel.findHelperByMobile(
            companyId,
            cleanMobile,
            req.params.id
        );
        if (duplicate) {
            throw new HttpError(409, "Helper with this mobile number already exists");
        }

        const updated = await helperModel.updateHelper(req.params.id, companyId, {
            name,
            mobile: cleanMobile,
            email: req.body.email !== undefined ? req.body.email : existing.email,
            address:
                req.body.address !== undefined ? req.body.address : existing.address,
            status: req.body.status !== undefined ? req.body.status : existing.status,
            availability_status:
                req.body.availability_status !== undefined
                    ? req.body.availability_status
                    : existing.availability_status
        });

        if (!updated) {
            throw new HttpError(404, "Helper not found");
        }

        await writeAudit(req, "HELPER_UPDATED", "helper", req.params.id);

        return res.status(200).json({
            success: true,
            message: "Helper updated successfully"
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const deactivateHelper = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const existing = await helperModel.getHelperById(req.params.id, companyId);

        if (!existing) {
            throw new HttpError(404, "Helper not found");
        }

        if (existing.availability_status === "ON_TRIP") {
            throw new HttpError(400, "Cannot deactivate helper who is on a trip");
        }

        const updated = await helperModel.deactivateHelper(req.params.id, companyId);

        if (!updated) {
            throw new HttpError(404, "Helper not found");
        }

        await writeAudit(req, "HELPER_DEACTIVATED", "helper", req.params.id);

        return res.status(200).json({
            success: true,
            message: "Helper deactivated successfully"
        });
    } catch (error) {
        return sendError(res, error);
    }
};

module.exports = {
    getHelpers,
    getHelperById,
    createHelper,
    updateHelper,
    deactivateHelper
};
