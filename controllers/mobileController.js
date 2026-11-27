const tripModel = require("../models/tripModel");
const tripExpenseModel = require("../models/tripExpenseModel");
const tripExpenseTypeModel = require("../models/tripExpenseTypeModel");
const tripSettlementModel = require("../models/tripSettlementModel");
const tripDocumentModel = require("../models/tripDocumentModel");
const tripBiltyModel = require("../models/tripBiltyModel");
const driverModel = require("../models/driverModel");
const helperModel = require("../models/helperModel");
const driverDocumentModel = require("../models/driverDocumentModel");
const helperDocumentModel = require("../models/helperDocumentModel");
const vehicleModel = require("../models/vehicleModel");
const vehicleDocumentModel = require("../models/vehicleDocumentModel");
const biltyModel = require("../models/biltyModel");
const { parsePagination } = require("../utils/pagination");
const { sendError, HttpError } = require("../utils/httpError");
const {
    isMissing,
    requirePositiveAmount
} = require("../utils/validation");
const { writeAudit } = require("../utils/audit");
const { publicFileUrl, validateUploadedFile } = require("../middleware/upload");

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

const publicDoc = (row) => {
    if (!row) return null;
    return {
        id: row.id,
        document_type: row.document_type,
        document_number: row.document_number || null,
        document_url: row.document_url,
        issue_date: row.issue_date || null,
        expiry_date: row.expiry_date || null,
        status: row.status,
        verification_status: row.verification_status || null
    };
};

/** BRD: own profile + permitted documents */
const getMyProfile = async (req, res) => {
    try {
        const staff = await resolveStaffProfile(req.user);
        const companyId = req.user.company_id;
        const pagination = { page: 1, limit: 50, offset: 0 };

        let documents = [];
        if (staff.role === "DRIVER") {
            const result = await driverDocumentModel.getDriverDocuments(
                companyId,
                staff.profile.id,
                pagination
            );
            documents = (result.rows || []).filter((d) => Number(d.status) === 1).map(publicDoc);
        } else {
            const result = await helperDocumentModel.getHelperDocuments(
                companyId,
                staff.profile.id,
                pagination
            );
            documents = (result.rows || []).filter((d) => Number(d.status) === 1).map(publicDoc);
        }

        const vehicle = await vehicleModel.getMyAssignedVehicle(req.user);

        return res.status(200).json({
            success: true,
            profile: {
                user_id: req.user.id,
                user_type: staff.role,
                company_id: companyId,
                name: staff.profile.name || req.user.name,
                mobile: staff.profile.mobile || req.user.mobile,
                email: req.user.email || null,
                staff_id: staff.profile.id,
                availability_status: staff.profile.availability_status || null,
                license_number: staff.profile.license_number || null
            },
            documents,
            assigned_vehicle: vehicle
                ? {
                      id: vehicle.id,
                      registration_no: vehicle.registration_no || null,
                      make: vehicle.make || null,
                      model: vehicle.model || null,
                      vehicle_type_id: vehicle.vehicle_type_id || null,
                      capacity: vehicle.capacity || null,
                      assignment_start_date: vehicle.assignment_start_date || null,
                      assignment_end_date: vehicle.assignment_end_date || null
                  }
                : null
        });
    } catch (error) {
        return sendError(res, error);
    }
};

/** BRD: currently assigned vehicle */
const getMyVehicle = async (req, res) => {
    try {
        await resolveStaffProfile(req.user);
        const vehicle = await vehicleModel.getMyAssignedVehicle(req.user);
        return res.status(200).json({
            success: true,
            vehicle: vehicle || null
        });
    } catch (error) {
        return sendError(res, error);
    }
};

/** BRD: vehicle documents for assigned vehicle */
const getMyVehicleDocuments = async (req, res) => {
    try {
        await resolveStaffProfile(req.user);
        const vehicle = await vehicleModel.getMyAssignedVehicle(req.user);
        if (!vehicle) {
            return res.status(200).json({
                success: true,
                documents: [],
                message: "No active vehicle assignment"
            });
        }

        const { rows, pagination } = await vehicleDocumentModel.getVehicleDocuments(
            req.user.company_id,
            vehicle.id,
            parsePagination(req.query)
        );

        return res.status(200).json({
            success: true,
            vehicle_id: vehicle.id,
            documents: (rows || [])
                .filter((d) => Number(d.status) === 1)
                .map(publicDoc),
            pagination
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const getMyTrips = async (req, res) => {
    try {
        const staff = await resolveStaffProfile(req.user);
        const scope = req.query.scope || (req.query.history === "1" ? "history" : "all");
        const filter =
            staff.role === "DRIVER"
                ? { driverId: staff.profile.id, scope }
                : { helperId: staff.profile.id, scope };

        const { rows: trips, pagination } = await tripModel.getAssignedTrips(
            req.user.company_id,
            filter,
            parsePagination(req.query)
        );

        return res.status(200).json({
            success: true,
            scope,
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
        const companyId = req.user.company_id;
        const trip = await tripModel.getTripById(req.params.id, companyId);
        assertTripAssigned(trip, staff);

        const bilties = await tripBiltyModel.listByTrip(companyId, trip.id);
        if (!bilties.length && trip.bilty_id) {
            const single = await biltyModel.getBiltyById(trip.bilty_id, companyId);
            if (single) {
                bilties.push({
                    bilty_id: single.id,
                    bilty_number: single.bilty_number,
                    bilty_status: single.status,
                    consignor: single.consignor,
                    consignee: single.consignee,
                    pickup_location: single.pickup_location,
                    drop_location: single.drop_location
                });
            }
        }

        const { rows: tripDocuments } = await tripDocumentModel.getByTrip(
            companyId,
            trip.id,
            { page: 1, limit: 100, offset: 0 }
        );

        const biltyDocuments = [];
        // Bilty module has no bilty_documents table yet — expose LR print-safe summary only
        for (const link of bilties) {
            biltyDocuments.push({
                bilty_id: link.bilty_id,
                bilty_number: link.bilty_number,
                status: link.bilty_status || link.status || null,
                consignor: link.consignor || null,
                consignee: link.consignee || null,
                route: {
                    from: link.pickup_location || null,
                    to: link.drop_location || null
                }
            });
        }

        let settlements = [];
        if (staff.role === "DRIVER") {
            settlements = await tripSettlementModel.getSettlementsByTrip(
                companyId,
                trip.id
            );
            settlements = settlements.map((s) => ({
                id: s.id,
                trip_id: s.trip_id,
                status: s.status,
                total_advance: s.total_advance,
                total_expenses: s.total_expenses,
                carry_forward_amount: s.carry_forward_amount,
                balance_amount: s.balance_amount,
                verified_at: s.verified_at,
                settled_at: s.settled_at
            }));
        }

        return res.status(200).json({
            success: true,
            trip: {
                ...trip,
                bilty_ids: bilties.map((b) => b.bilty_id),
                bilties,
                trip_documents: (tripDocuments || []).map((d) => ({
                    id: d.id,
                    document_type: d.document_type,
                    document_url: d.document_url,
                    remarks: d.remarks,
                    created_at: d.created_at
                })),
                bilty_summaries: biltyDocuments,
                settlements
            }
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const getMyExpenseTypes = async (req, res) => {
    try {
        await resolveStaffProfile(req.user);
        const expenseTypes = await tripExpenseTypeModel.listTypes(req.user.company_id);
        return res.status(200).json({ success: true, expenseTypes });
    } catch (error) {
        return sendError(res, error);
    }
};

/** BRD: view expense approval status */
const getMyExpenses = async (req, res) => {
    try {
        const staff = await resolveStaffProfile(req.user);
        if (staff.role !== "DRIVER") {
            throw new HttpError(403, "Only drivers can view submitted expenses");
        }

        const tripId = req.query.trip_id ? Number(req.query.trip_id) : null;
        if (tripId) {
            const trip = await tripModel.getTripById(tripId, req.user.company_id);
            assertTripAssigned(trip, staff);
        }

        const { rows: expenses, pagination } =
            await tripExpenseModel.getExpensesForSubmitter(
                req.user.company_id,
                req.user.id,
                parsePagination(req.query),
                { tripId }
            );

        return res.status(200).json({
            success: true,
            expenses,
            pagination
        });
    } catch (error) {
        return sendError(res, error);
    }
};

/** BRD: settlement status where permitted (assigned trip + driver) */
const getMyTripSettlement = async (req, res) => {
    try {
        const staff = await resolveStaffProfile(req.user);
        if (staff.role !== "DRIVER") {
            throw new HttpError(403, "Settlement view is for drivers");
        }

        const trip = await tripModel.getTripById(
            req.params.id,
            req.user.company_id
        );
        assertTripAssigned(trip, staff);

        const settlements = await tripSettlementModel.getSettlementsByTrip(
            req.user.company_id,
            trip.id
        );

        return res.status(200).json({
            success: true,
            trip_id: trip.id,
            settlements: settlements.map((s) => ({
                id: s.id,
                status: s.status,
                total_advance: s.total_advance,
                carry_forward_amount: s.carry_forward_amount,
                total_expenses: s.total_expenses,
                balance_amount: s.balance_amount,
                verified_at: s.verified_at,
                settled_at: s.settled_at
            }))
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

        const allowed = await tripExpenseTypeModel.isAllowedType(
            req.user.company_id,
            expense_type
        );
        if (!allowed) {
            throw new HttpError(400, "Invalid expense_type");
        }

        await validateUploadedFile(req.file);
        let receipt = receipt_url || null;
        if (req.file?.filename) {
            receipt = publicFileUrl(req.file.filename);
        }
        if (
            typeof receipt !== "string" ||
            (!receipt.startsWith("/api/files/") && !/^https:\/\//i.test(receipt))
        ) {
            throw new HttpError(
                400,
                "Receipt photo/file is required (multipart file or HTTPS receipt_url)"
            );
        }

        const amount = requirePositiveAmount(requested_amount, "requested_amount");
        const expenseId = await tripExpenseModel.createExpense({
            company_id: req.user.company_id,
            trip_id,
            expense_type: String(expense_type)
                .trim()
                .toUpperCase()
                .replace(/[\s-]+/g, "_"),
            requested_amount: amount,
            receipt_url: receipt,
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
    getMyProfile,
    getMyVehicle,
    getMyVehicleDocuments,
    getMyTrips,
    getMyTripById,
    getMyExpenseTypes,
    getMyExpenses,
    getMyTripSettlement,
    submitMyExpense
};
