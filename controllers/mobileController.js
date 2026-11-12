const tripModel = require("../models/tripModel");
const tripExpenseModel = require("../models/tripExpenseModel");
const driverModel = require("../models/driverModel");
const helperModel = require("../models/helperModel");
const { parsePagination } = require("../utils/pagination");
const { sendError, HttpError } = require("../utils/httpError");
const {
    isMissing,
    requirePositiveAmount
} = require("../utils/validation");
const { writeAudit } = require("../utils/audit");

const resolveStaffProfile = async (user) => {
    if (!user?.company_id) {
        throw new HttpError(400, "User is not assigned to a company");
    }

    if (user.user_type === "DRIVER") {
        const byUser = await driverModel.findDriverByUserId(
            user.id,
            user.company_id
        );
        const driver =
            byUser ||
            (await driverModel.findDriverByMobile(user.company_id, user.mobile));

        if (!driver) {
            throw new HttpError(404, "Driver profile not found for this login");
        }

        return { role: "DRIVER", profile: driver };
    }

    if (user.user_type === "HELPER") {
        const byUser = await helperModel.findHelperByUserId(
            user.id,
            user.company_id
        );
        const helper =
            byUser ||
            (await helperModel.findHelperByMobile(user.company_id, user.mobile));

        if (!helper) {
            throw new HttpError(404, "Helper profile not found for this login");
        }

        return { role: "HELPER", profile: helper };
    }

    throw new HttpError(403, "Only Driver or Helper mobile users can access this");
};

const assertTripAssigned = (trip, staff) => {
    if (!trip) {
        throw new HttpError(404, "Trip not found");
    }

    if (staff.role === "DRIVER" && Number(trip.driver_id) !== Number(staff.profile.id)) {
        throw new HttpError(403, "Trip is not assigned to this driver");
    }

    if (staff.role === "HELPER" && Number(trip.helper_id) !== Number(staff.profile.id)) {
        throw new HttpError(403, "Trip is not assigned to this helper");
    }
};

const getMyTrips = async (req, res) => {
    try {
        const staff = await resolveStaffProfile(req.user);
        const filter =
            staff.role === "DRIVER"
                ? { driverId: staff.profile.id }
                : { helperId: staff.profile.id };

        const { rows: trips, pagination } = await tripModel.getAssignedTrips(
            req.user.company_id,
            filter,
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

const getMyTripById = async (req, res) => {
    try {
        const staff = await resolveStaffProfile(req.user);
        const trip = await tripModel.getTripById(
            req.params.id,
            req.user.company_id
        );
        assertTripAssigned(trip, staff);

        return res.status(200).json({
            success: true,
            trip
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const submitMyExpense = async (req, res) => {
    try {
        const staff = await resolveStaffProfile(req.user);

        if (staff.role !== "DRIVER") {
            throw new HttpError(403, "Only drivers can submit trip expenses");
        }

        const {
            trip_id,
            expense_type,
            requested_amount,
            receipt_url,
            remarks
        } = req.body;

        if (isMissing(trip_id) || isMissing(expense_type) || isMissing(requested_amount)) {
            throw new HttpError(
                400,
                "trip_id, expense_type and requested_amount are required"
            );
        }

        const trip = await tripModel.getTripById(trip_id, req.user.company_id);
        assertTripAssigned(trip, staff);

        const amount = requirePositiveAmount(requested_amount, "requested_amount");
        const expenseId = await tripExpenseModel.createExpense({
            company_id: req.user.company_id,
            trip_id,
            expense_type,
            requested_amount: amount,
            receipt_url: receipt_url || null,
            remarks: remarks || null,
            submitted_by: req.user.id
        });

        await writeAudit(req, "MOBILE_EXPENSE_SUBMITTED", "trip_expense", expenseId);

        return res.status(201).json({
            success: true,
            message: "Expense submitted for approval",
            expense_id: expenseId
        });
    } catch (error) {
        return sendError(res, error);
    }
};

module.exports = {
    getMyTrips,
    getMyTripById,
    submitMyExpense
};
