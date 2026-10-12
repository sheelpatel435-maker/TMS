const vehicleTypeModel = require("../models/vehicleTypeModel");

const getVehicleTypes = async (req, res) => {
    try {
        const vehicleTypes =
            await vehicleTypeModel.getVehicleTypes();

        return res.status(200).json({
            success: true,
            vehicleTypes
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

const createVehicleType = async (req, res) => {
    try {
        const { name, status } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: "name is required"
            });
        }

        const id =
            await vehicleTypeModel.createVehicleType(
                name,
                status ?? 1
            );

        return res.status(201).json({
            success: true,
            message: "Vehicle type created successfully",
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
    getVehicleTypes,
    createVehicleType
};
