const vehicleAssignmentModel = require("../models/vehicleAssignmentModel");

const getVehicleAssignments = async (req, res) => {
    try {
        const companyId = req.user.company_id;

        const assignments =
            await vehicleAssignmentModel.getVehicleAssignments(companyId);

        return res.status(200).json({
            success: true,
            assignments
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

const createVehicleAssignment = async (req, res) => {
    try {
        const companyId = req.user.company_id;

        const {
            vehicle_id,
            driver_id,
            helper_id,
            start_date,
            end_date,
            is_active
        } = req.body;

        if (!vehicle_id || !start_date) {
            return res.status(400).json({
                success: false,
                message: "vehicle_id and start_date are required"
            });
        }

        const id =
            await vehicleAssignmentModel.createVehicleAssignment(
                companyId,
                vehicle_id,
                driver_id,
                helper_id,
                start_date,
                end_date,
                is_active
            );

        return res.status(201).json({
            success: true,
            message: "Vehicle assignment created successfully",
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
    getVehicleAssignments,
    createVehicleAssignment
};
