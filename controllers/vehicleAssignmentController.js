const vehicleAssignmentModel = require("../models/vehicleAssignmentModel");
const { parsePagination } = require("../utils/pagination");
const { sendError, HttpError } = require("../utils/httpError");
const { isMissing } = require("../utils/validation");
const { assertOwned } = require("../utils/companyScope");

const getVehicleAssignments = async (req, res) => {
    try {
        const { rows: assignments, pagination } =
            await vehicleAssignmentModel.getVehicleAssignments(
                req.user.company_id,
                parsePagination(req.query)
            );

        return res.status(200).json({
            success: true,
            assignments,
            pagination
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const createVehicleAssignment = async (req, res) => {
    try {
        const {
            vehicle_id,
            driver_id,
            helper_id,
            start_date,
            end_date,
            is_active
        } = req.body;

        if (isMissing(vehicle_id) || isMissing(start_date)) {
            throw new HttpError(400, "vehicle_id and start_date are required");
        }

        await assertOwned("vehicles", vehicle_id, req.user.company_id, "Vehicle");
        await assertOwned("drivers", driver_id, req.user.company_id, "Driver");
        await assertOwned("helpers", helper_id, req.user.company_id, "Helper");

        const id = await vehicleAssignmentModel.createVehicleAssignment(
            req.user.company_id,
            {
                vehicle_id,
                driver_id,
                helper_id,
                start_date,
                end_date,
                is_active
            }
        );

        return res.status(201).json({
            success: true,
            message: "Vehicle assignment created successfully",
            id
        });
    } catch (error) {
        return sendError(res, error);
    }
};

module.exports = {
    getVehicleAssignments,
    createVehicleAssignment
};
