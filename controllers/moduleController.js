const moduleModel = require("../models/moduleModel");
const { parsePagination } = require("../utils/pagination");
const { sendError } = require("../utils/httpError");

const getModules = async (req, res) => {
    try {
        const { rows: modules, pagination } = await moduleModel.getAllModules(
            parsePagination(req.query)
        );

        return res.status(200).json({
            success: true,
            modules,
            pagination
        });
    } catch (error) {
        return sendError(res, error);
    }
};

module.exports = {
    getModules
};
