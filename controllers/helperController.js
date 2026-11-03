const helperModel = require("../models/helperModel");
const { parsePagination } = require("../utils/pagination");
const { sendError, HttpError } = require("../utils/httpError");
const { firstPresent, isMissing } = require("../utils/validation");
const { resolveCompanyId } = require("../utils/companyScope");
const { parseListFilters } = require("../utils/queryFilters");
const { writeAudit } = require("../utils/audit");

const getHelpers = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const { rows: helpers, pagination } = await helperModel.getHelpers(
            companyId,
            parsePagination(req.query),
            parseListFilters(req.query)
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
        const { mobile } = req.body;

        if (isMissing(name)) {
            throw new HttpError(400, "Helper name is required");
        }

        if (isMissing(mobile)) {
            throw new HttpError(400, "Mobile number is required");
        }

        const id = await helperModel.createHelper(companyId, {
            ...req.body,
            name
        });
        await writeAudit(req, "HELPER_CREATED", "helper", id);

        return res.status(201).json({
            success: true,
            message: "Helper created successfully",
            id
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const updateHelper = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const name = firstPresent(req.body.name, req.body.full_name);
        const { mobile } = req.body;

        if (isMissing(name) || isMissing(mobile)) {
            throw new HttpError(400, "Helper name and mobile are required");
        }

        const updated = await helperModel.updateHelper(req.params.id, companyId, {
            ...req.body,
            name
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
