const biltyModel = require("../models/biltyModel");

const getBilties = async (req, res) => {
    try {
        const bilties = await biltyModel.getBilties(
            req.user.company_id
        );

        return res.status(200).json({
            success: true,
            bilties
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

const createBilty = async (req, res) => {
    try {
        const { bilty_number } = req.body;

        if (!bilty_number) {
            return res.status(400).json({
                success: false,
                message: "Bilty number is required"
            });
        }

        const id = await biltyModel.createBilty(
            req.user.company_id,
            req.body
        );

        return res.status(201).json({
            success: true,
            message: "Bilty created successfully",
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
    getBilties,
    createBilty
};
