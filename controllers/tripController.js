const tripModel = require("../models/tripModel");

const getTrips = async (req, res) => {
    try {
        const trips = await tripModel.getTrips(
            req.user.company_id
        );

        return res.status(200).json({
            success: true,
            trips
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

const createTrip = async (req, res) => {
    try {
        const {
            trip_no,
            vehicle_id,
            driver_id
        } = req.body;

        if (!trip_no || !vehicle_id || !driver_id) {
            return res.status(400).json({
                success: false,
                message: "Trip number, vehicle and driver are required"
            });
        }

        const id = await tripModel.createTrip(
            req.user.company_id,
            req.user.id,
            req.body
        );

        return res.status(201).json({
            success: true,
            message: "Trip created successfully",
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
    getTrips,
    createTrip
};
