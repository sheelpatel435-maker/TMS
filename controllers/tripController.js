const tripModel = require("../models/tripModel");
const tripStopModel = require("../models/tripStopModel");
const tripBiltyModel = require("../models/tripBiltyModel");
const tripDocumentModel = require("../models/tripDocumentModel");
const { parsePagination } = require("../utils/pagination");
const { sendError, HttpError } = require("../utils/httpError");
const { isMissing } = require("../utils/validation");
const { assertOwned, resolveCompanyId } = require("../utils/companyScope");
const { parseListFilters } = require("../utils/queryFilters");
const { assertTransition, isAllowedStatus } = require("../utils/statusTransitions");
const { writeAudit } = require("../utils/audit");
const { withTransaction } = require("../utils/transaction");
const {
    assertCrewAssignable,
    assertCrewFreeForTrip,
    syncCrewAvailabilityForTrip
} = require("../utils/crewWorkflow");

const resolveBiltyIds = (body) => {
    if (Array.isArray(body?.bilty_ids) && body.bilty_ids.length) {
        return body.bilty_ids.map((id) => Number(id)).filter(Boolean);
    }
    if (!isMissing(body?.bilty_id)) {
        return [Number(body.bilty_id)].filter(Boolean);
    }
    return [];
};

const assertBiltiesOwned = async (companyId, biltyIds) => {
    const bilties = [];
    for (const biltyId of biltyIds) {
        const bilty = await assertOwned("bilties", biltyId, companyId, "Bilty");
        if (bilty) bilties.push(bilty);
    }
    return bilties;
};

const assertTripCrew = async (companyId, { driverId, helperId }, excludeTripId = null) => {
    const driver = await assertOwned("drivers", driverId, companyId, "Driver");
    assertCrewAssignable(driver, "Driver");

    const helper = await assertOwned("helpers", helperId, companyId, "Helper");
    assertCrewAssignable(helper, "Helper");

    await assertCrewFreeForTrip(
        companyId,
        { driverId, helperId: helperId || null },
        excludeTripId
    );
};

const assertLoadFitsVehicle = (vehicle, bilty) => {
    if (!vehicle || !bilty) {
        return;
    }

    const capacity = Number(vehicle.capacity);
    const weight = Number(bilty.weight_kg);

    if (Number.isFinite(capacity) && capacity > 0 && Number.isFinite(weight) && weight > capacity) {
        throw new HttpError(400, "Load weight exceeds vehicle capacity");
    }
};

const saveStops = async (companyId, tripId, stops) => {
    if (!Array.isArray(stops)) {
        return;
    }

    for (const stop of stops) {
        if (isMissing(stop.city)) {
            throw new HttpError(400, "Each stop needs a city");
        }
    }

    await tripStopModel.replaceStops(companyId, tripId, stops);
};

const getTrips = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const { rows: trips, pagination } = await tripModel.getTrips(
            companyId,
            parsePagination(req.query),
            parseListFilters(req.query)
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

const getTripById = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const trip = await tripModel.getTripById(req.params.id, companyId);

        if (!trip) {
            throw new HttpError(404, "Trip not found");
        }

        const bilties = await tripBiltyModel.listByTrip(companyId, trip.id);
        if (!bilties.length && trip.bilty_id) {
            // legacy single bilty_id row
            bilties.push({ bilty_id: trip.bilty_id });
        }
        const { rows: documents } = await tripDocumentModel.getByTrip(
            companyId,
            trip.id,
            { page: 1, limit: 100, offset: 0 }
        );

        return res.status(200).json({
            success: true,
            trip: {
                ...trip,
                bilty_ids: bilties.map((row) => row.bilty_id),
                bilties,
                documents
            }
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const createTrip = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const {
            vehicle_id,
            driver_id,
            helper_id,
            client_id,
            source,
            destination,
            status,
            stops
        } = req.body;

        if (isMissing(vehicle_id) || isMissing(driver_id)) {
            throw new HttpError(400, "Vehicle and driver are required");
        }

        if (isMissing(source) || isMissing(destination)) {
            throw new HttpError(400, "Source and destination are required");
        }

        if (status && !isAllowedStatus("trip", status)) {
            throw new HttpError(400, "Invalid trip status");
        }

        const biltyIds = resolveBiltyIds(req.body);
        const vehicle = await assertOwned("vehicles", vehicle_id, companyId, "Vehicle");
        await assertTripCrew(companyId, {
            driverId: driver_id,
            helperId: helper_id
        });
        const bilties = await assertBiltiesOwned(companyId, biltyIds);
        await assertOwned("clients", client_id, companyId, "Client");
        for (const bilty of bilties) {
            assertLoadFitsVehicle(vehicle, bilty);
        }

        const primaryBiltyId = tripBiltyModel.primaryBiltyId(biltyIds);
        const id = await tripModel.createTrip(companyId, {
            ...req.body,
            bilty_id: primaryBiltyId,
            status: status || (primaryBiltyId ? "BILTY_LINKED" : "DRAFT")
        });

        await tripBiltyModel.replaceForTrip(companyId, id, biltyIds);
        await saveStops(companyId, id, stops);
        await writeAudit(req, "TRIP_CREATED", "trip", id);

        return res.status(201).json({
            success: true,
            message: "Trip created successfully",
            id,
            bilty_ids: biltyIds
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const updateTrip = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const trip = await tripModel.getTripById(req.params.id, companyId);

        if (!trip) {
            throw new HttpError(404, "Trip not found");
        }

        if (["COMPLETED", "CANCELLED"].includes(trip.status)) {
            throw new HttpError(400, "Completed or cancelled trips cannot be edited");
        }

        const {
            vehicle_id,
            driver_id,
            helper_id,
            client_id,
            source,
            destination,
            stops
        } = req.body;

        if (isMissing(vehicle_id) || isMissing(driver_id)) {
            throw new HttpError(400, "Vehicle and driver are required");
        }

        if (isMissing(source) || isMissing(destination)) {
            throw new HttpError(400, "Source and destination are required");
        }

        const biltyIds = resolveBiltyIds(req.body);
        const vehicle = await assertOwned("vehicles", vehicle_id, companyId, "Vehicle");
        await assertTripCrew(
            companyId,
            { driverId: driver_id, helperId: helper_id },
            trip.id
        );
        const bilties = await assertBiltiesOwned(companyId, biltyIds);
        await assertOwned("clients", client_id, companyId, "Client");
        for (const bilty of bilties) {
            assertLoadFitsVehicle(vehicle, bilty);
        }

        const primaryBiltyId = tripBiltyModel.primaryBiltyId(biltyIds);
        await tripModel.updateTrip(req.params.id, companyId, {
            ...req.body,
            bilty_id: primaryBiltyId
        });
        await tripBiltyModel.replaceForTrip(companyId, trip.id, biltyIds);
        await saveStops(companyId, trip.id, stops);
        await writeAudit(req, "TRIP_UPDATED", "trip", req.params.id);

        return res.status(200).json({
            success: true,
            message: "Trip updated successfully",
            bilty_ids: biltyIds
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const deactivateTrip = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const trip = await tripModel.getTripById(req.params.id, companyId);

        if (!trip) {
            throw new HttpError(404, "Trip not found");
        }

        if (trip.status === "CANCELLED") {
            return res.status(200).json({
                success: true,
                message: "Trip already cancelled"
            });
        }

        if (["COMPLETED", "CLOSED"].includes(trip.status)) {
            throw new HttpError(400, "Completed/closed trips cannot be cancelled");
        }

        assertTransition("trip", trip.status, "CANCELLED");
        await tripModel.updateTripStatus(req.params.id, companyId, "CANCELLED");
        await syncCrewAvailabilityForTrip(companyId, trip, "CANCELLED");
        await writeAudit(
            req,
            "TRIP_CANCELLED",
            "trip",
            req.params.id,
            `${trip.status} -> CANCELLED`
        );

        return res.status(200).json({
            success: true,
            message: "Trip cancelled successfully"
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const updateTripStatus = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const { status } = req.body;

        if (!isAllowedStatus("trip", status)) {
            throw new HttpError(400, "Invalid trip status");
        }

        const trip = await tripModel.getTripById(req.params.id, companyId);

        if (!trip) {
            throw new HttpError(404, "Trip not found");
        }

        assertTransition("trip", trip.status, status);

        await withTransaction(async (connection) => {
            await tripModel.updateTripStatus(
                req.params.id,
                companyId,
                status,
                connection
            );
            if (["COMPLETED", "CLOSED"].includes(status)) {
                await tripModel.recordCompletedTripAssignment(trip, connection);
            }
            await writeAudit(
                req,
                status === "CANCELLED" ? "TRIP_CANCELLED" : "TRIP_STATUS_UPDATED",
                "trip",
                req.params.id,
                `${trip.status} -> ${status}`,
                { companyId, connection, required: true }
            );
        });
        await syncCrewAvailabilityForTrip(companyId, trip, status);

        return res.status(200).json({
            success: true,
            message: "Trip status updated successfully"
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const getTripRoute = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const trip = await tripModel.getTripById(req.params.id, companyId);

        if (!trip) {
            throw new HttpError(404, "Trip not found");
        }

        const stops = await tripStopModel.getStopsByTrip(req.params.id, companyId);

        return res.status(200).json({
            success: true,
            trip_id: trip.id,
            source: trip.source,
            destination: trip.destination,
            stops
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const saveTripRoute = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const trip = await tripModel.getTripById(req.params.id, companyId);

        if (!trip) {
            throw new HttpError(404, "Trip not found");
        }

        const stops = req.body.stops || req.body;

        if (!Array.isArray(stops)) {
            throw new HttpError(400, "stops array is required");
        }

        await saveStops(companyId, trip.id, stops);
        await writeAudit(req, "TRIP_ROUTE_UPDATED", "trip", trip.id);

        return res.status(200).json({
            success: true,
            message: "Trip route saved successfully"
        });
    } catch (error) {
        return sendError(res, error);
    }
};

module.exports = {
    getTrips,
    getTripById,
    createTrip,
    updateTrip,
    deactivateTrip,
    updateTripStatus,
    getTripRoute,
    saveTripRoute
};
