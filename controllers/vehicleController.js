const vehicleModel = require("../models/vehicleModel");

const getVehicles = async (req, res) => {
    try {
        const vehicles = await vehicleModel.getVehicles(
            req.user.company_id
        );

        return res.status(200).json({
            success: true,
            vehicles
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

const createVehicle = async (req, res) => {
    try {
        const { registration_no } = req.body;

        if (!registration_no) {
            return res.status(400).json({
                success: false,
                message: "Registration number is required"
            });
        }

        const id = await vehicleModel.createVehicle(
            req.user.company_id,
            req.body
        );

        return res.status(201).json({
            success: true,
            message: "Vehicle created successfully",
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
    getVehicles,
    createVehicle
};