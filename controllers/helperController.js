const helperModel = require("../models/helperModel");

const getHelpers = async (req, res) => {
    try {
        const helpers = await helperModel.getHelpers(
            req.user.company_id
        );

        return res.status(200).json({
            success: true,
            helpers
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

const createHelper = async (req, res) => {
    try {
        const { full_name } = req.body;

        if (!full_name) {
            return res.status(400).json({
                success: false,
                message: "Full name is required"
            });
        }

        const id = await helperModel.createHelper(
            req.user.company_id,
            req.body
        );

        return res.status(201).json({
            success: true,
            message: "Helper created successfully",
            id
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

module.exports = {
    getHelpers,
    createHelper
};