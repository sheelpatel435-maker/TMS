const helperModel = require("../models/helperModel");
const { parsePagination } = require("../utils/pagination");
const { sendError, HttpError } = require("../utils/httpError");
const { firstPresent, isMissing } = require("../utils/validation");

const getHelpers = async (req, res) => {
    try {
        if (!req.user.company_id) {
            throw new HttpError(400, "User is not assigned to a company");
        }

        const { rows: helpers, pagination } = await helperModel.getHelpers(
            req.user.company_id,
            parsePagination(req.query)
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

const createHelper = async (req, res) => {
    try {
        const name = firstPresent(req.body.name, req.body.full_name);
        const { mobile } = req.body;

        if (isMissing(name)) {
            throw new HttpError(400, "Helper name is required");
        }

        if (isMissing(mobile)) {
            throw new HttpError(400, "Mobile number is required");
        }

        const id = await helperModel.createHelper(
            req.user.company_id,
            {
                ...req.body,
                name
            }
        );

        return res.status(201).json({
            success: true,
            message: "Helper created successfully",
            id
        });
    } catch (error) {
        return sendError(res, error);
    }
};

module.exports = {
    getHelpers,
    createHelper
};
