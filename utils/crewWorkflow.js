const db = require("../config/db");
const { HttpError } = require("./httpError");

/** Documented crew availability: AVAILABLE | ASSIGNED | ON_TRIP | INACTIVE */
const AVAILABILITY_STATUSES = Object.freeze([
    "AVAILABLE",
    "ASSIGNED",
    "ON_TRIP",
    "INACTIVE"
]);

/** Admin Active/Inactive only (ON_TRIP / ASSIGNED are system-managed). */
const DUTY_STATUSES = Object.freeze(["ACTIVE", "INACTIVE"]);

/** Trip still holds the crew (not freed yet). */
const OPEN_TRIP_STATUSES = Object.freeze([
    "DRAFT",
    "CREATED",
    "BILTY_LINKED",
    "READY_FOR_DISPATCH",
    "DISPATCHED",
    "IN_TRANSIT",
    "DELIVERED",
    "FINAL_REPORT_SUBMITTED",
    "VERIFIED"
]);

/** Crew is physically on the road / still closing the trip. */
const ON_TRIP_STATUSES = Object.freeze([
    "DISPATCHED",
    "IN_TRANSIT",
    "DELIVERED",
    "FINAL_REPORT_SUBMITTED",
    "VERIFIED"
]);

const assertCrewAssignable = (person, label) => {
    if (!person) {
        return;
    }

    if (Number(person.status) !== 1) {
        throw new HttpError(400, `${label} is inactive`);
    }

    if (person.availability_status === "ON_TRIP") {
        throw new HttpError(400, `${label} is already on another trip`);
    }

    if (person.availability_status === "INACTIVE") {
        throw new HttpError(400, `${label} is not available`);
    }
};

const resolveDutyUpdate = (duty) => {
    const value = String(duty || "").toUpperCase();

    if (!DUTY_STATUSES.includes(value)) {
        throw new HttpError(400, "duty must be ACTIVE or INACTIVE");
    }

    if (value === "ACTIVE") {
        return { status: 1, availability_status: "AVAILABLE" };
    }

    return { status: 0, availability_status: "INACTIVE" };
};

const findOpenTripForCrew = async (
    companyId,
    { driverId = null, helperId = null },
    excludeTripId = null
) => {
    if (!driverId && !helperId) {
        return null;
    }

    const where = [
        "company_id = ?",
        `status IN (${OPEN_TRIP_STATUSES.map(() => "?").join(",")})`
    ];
    const params = [companyId, ...OPEN_TRIP_STATUSES];

    if (driverId && helperId) {
        where.push("(driver_id = ? OR helper_id = ?)");
        params.push(driverId, helperId);
    } else if (driverId) {
        where.push("driver_id = ?");
        params.push(driverId);
    } else {
        where.push("helper_id = ?");
        params.push(helperId);
    }

    if (excludeTripId) {
        where.push("id <> ?");
        params.push(excludeTripId);
    }

    const [rows] = await db.execute(
        `SELECT id, driver_id, helper_id, status
         FROM trips
         WHERE ${where.join(" AND ")}
         LIMIT 1`,
        params
    );

    return rows[0] || null;
};

const assertCrewFreeForTrip = async (
    companyId,
    { driverId, helperId },
    excludeTripId = null
) => {
    const conflict = await findOpenTripForCrew(
        companyId,
        { driverId, helperId },
        excludeTripId
    );

    if (!conflict) {
        return;
    }

    if (driverId && Number(conflict.driver_id) === Number(driverId)) {
        throw new HttpError(
            400,
            `Driver is already assigned to open trip #${conflict.id}`
        );
    }

    if (helperId && Number(conflict.helper_id) === Number(helperId)) {
        throw new HttpError(
            400,
            `Helper is already assigned to open trip #${conflict.id}`
        );
    }
};

const setAvailability = async (table, id, companyId, availabilityStatus) => {
    if (!id) {
        return;
    }

    await db.execute(
        `UPDATE ${table}
         SET availability_status = ?
         WHERE id = ? AND company_id = ?`,
        [availabilityStatus, id, companyId]
    );
};

const hasOtherOnTrip = async (companyId, { driverId, helperId }, excludeTripId) => {
    const where = [
        "company_id = ?",
        `status IN (${ON_TRIP_STATUSES.map(() => "?").join(",")})`,
        "id <> ?"
    ];
    const params = [companyId, ...ON_TRIP_STATUSES, excludeTripId];

    if (driverId) {
        where.push("driver_id = ?");
        params.push(driverId);
    } else if (helperId) {
        where.push("helper_id = ?");
        params.push(helperId);
    } else {
        return false;
    }

    const [rows] = await db.execute(
        `SELECT id FROM trips WHERE ${where.join(" AND ")} LIMIT 1`,
        params
    );

    return rows.length > 0;
};

const syncCrewAvailabilityForTrip = async (companyId, trip, nextStatus) => {
    if (!trip) {
        return;
    }

    if (ON_TRIP_STATUSES.includes(nextStatus)) {
        await setAvailability("drivers", trip.driver_id, companyId, "ON_TRIP");
        await setAvailability("helpers", trip.helper_id, companyId, "ON_TRIP");
        return;
    }

    if (!["COMPLETED", "CLOSED", "CANCELLED"].includes(nextStatus)) {
        return;
    }

    if (
        trip.driver_id &&
        !(await hasOtherOnTrip(companyId, { driverId: trip.driver_id }, trip.id))
    ) {
        await setAvailability("drivers", trip.driver_id, companyId, "AVAILABLE");
    }

    if (
        trip.helper_id &&
        !(await hasOtherOnTrip(companyId, { helperId: trip.helper_id }, trip.id))
    ) {
        await setAvailability("helpers", trip.helper_id, companyId, "AVAILABLE");
    }
};

module.exports = {
    AVAILABILITY_STATUSES,
    DUTY_STATUSES,
    OPEN_TRIP_STATUSES,
    ON_TRIP_STATUSES,
    assertCrewAssignable,
    assertCrewFreeForTrip,
    syncCrewAvailabilityForTrip,
    setAvailability,
    resolveDutyUpdate
};
