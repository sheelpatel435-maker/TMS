const tripModel = require("../models/tripModel");
const { parsePagination } = require("../utils/pagination");
const { sendError, HttpError } = require("../utils/httpError");
const { isMissing } = require("../utils/validation");
const { assertOwned } = require("../utils/companyScope");

const TRIP_STATUSES = [
    "CREATED",
    "DISPATCHED",
    "IN_TRANSIT",
    "DELIVERED",
    "COMPLETED",
    "CANCELLED"
];

const getTrips = async (req, res) => {
    try {
        const { rows: trips, pagination } = await tripModel.getTrips(
            req.user.company_id,
            parsePagination(req.query)
        );

        return res.status(200).json({
            success: true,
            trips,
            pagination
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const createTrip = async (req, res) => {
    try {
        const {
            vehicle_id,
            driver_id,
            helper_id,
            bilty_id,
            client_id,
            source,
            destination,
            status
        } = req.body;

        if (isMissing(vehicle_id) || isMissing(driver_id)) {
            throw new HttpError(400, "Vehicle and driver are required");
        }

        if (isMissing(source) || isMissing(destination)) {
            throw new HttpError(400, "Source and destination are required");
        }

        if (status && !TRIP_STATUSES.includes(status)) {
            throw new HttpError(400, "Invalid trip status");
        }

        await assertOwned("vehicles", vehicle_id, req.user.company_id, "Vehicle");
        await assertOwned("drivers", driver_id, req.user.company_id, "Driver");
        await assertOwned("helpers", helper_id, req.user.company_id, "Helper");
        await assertOwned("bilties", bilty_id, req.user.company_id, "Bilty");
        await assertOwned("clients", client_id, req.user.company_id, "Client");

        const id = await tripModel.createTrip(
            req.user.company_id,
            req.body
        );

        return res.status(201).json({
            success: true,
            message: "Trip created successfully",
            id
        });
    } catch (error) {
        return sendError(res, error);
    }
};

module.exports = {
    getTrips,
    createTrip
};
