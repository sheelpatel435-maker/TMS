const moduleModel = require("../models/moduleModel");

const getModules = async (req, res) => {
    try {
        const modules = await moduleModel.getAllModules();

        return res.status(200).json({
            success: true,
            modules
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
    getModules
};