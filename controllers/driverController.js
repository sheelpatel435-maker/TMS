const driverModel = require("../models/driverModel");

const getDrivers = async (req, res) => {
    try {
        const drivers = await driverModel.getDrivers(
            req.user.company_id
        );

        return res.status(200).json({
            success: true,
            drivers
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

const createDriver = async (req, res) => {
    try {
        const {
            name,
            mobile,
            license_number
        } = req.body;

        if (!name || !mobile || !license_number) {
            return res.status(400).json({
                success: false,
                message: "Name, mobile and license number are required"
            });
        }

        const id = await driverModel.createDriver(
            req.user.company_id,
            req.body
        );

        return res.status(201).json({
            success: true,
            message: "Driver created successfully",
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
    getDrivers,
    createDriver
};