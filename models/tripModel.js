const db = require("../config/db");
const { paginatedSelect } = require("../utils/pagination");
const { buildListWhere } = require("../utils/queryFilters");

const TRIP_COLUMNS = `id, company_id, vehicle_id, driver_id, helper_id, bilty_id, client_id,
                  source, destination, start_date, end_date, status, created_at, updated_at`;

const getTrips = async (companyId, pagination, filters = {}) => {
    const { where, params } = buildListWhere({
        companyId,
        filters,
        searchColumns: ["source", "destination"],
        dateColumn: "start_date"
    });

    return paginatedSelect(db, {
        table: "trips",
        columns: TRIP_COLUMNS,
        where,
        params,
        pagination
    });
};

const getTripById = async (id, companyId) => {
    const [rows] = await db.execute(
        `SELECT ${TRIP_COLUMNS}
         FROM trips
         WHERE id = ? AND company_id = ?
         LIMIT 1`,
        [id, companyId]
    );

    return rows[0] || null;
};

const createTrip = async (companyId, data) => {
    const [result] = await db.execute(
        `INSERT INTO trips
        (
            company_id,
            vehicle_id,
            driver_id,
            helper_id,
            bilty_id,
            client_id,
            source,
            destination,
            start_date,
            end_date,
            status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            companyId,
            data.vehicle_id,
            data.driver_id,
            data.helper_id || null,
            data.bilty_id || null,
            data.client_id || null,
            data.source,
            data.destination,
            data.start_date || null,
            data.end_date || null,
            data.status || "DRAFT"
        ]
    );

    return result.insertId;
};

const getAssignedTrips = async (companyId, { driverId = null, helperId = null }, pagination) => {
    const where = ["company_id = ?"];
    const params = [companyId];

    if (driverId) {
        where.push("driver_id = ?");
        params.push(driverId);
    } else if (helperId) {
        where.push("helper_id = ?");
        params.push(helperId);
    } else {
        where.push("1 = 0");
    }

    return paginatedSelect(db, {
        table: "trips",
        columns: TRIP_COLUMNS,
        where: where.join(" AND "),
        params,
        pagination
    });
};

const updateTrip = async (id, companyId, data) => {
    const [result] = await db.execute(
        `UPDATE trips
         SET vehicle_id = ?,
             driver_id = ?,
             helper_id = ?,
             bilty_id = ?,
             client_id = ?,
             source = ?,
             destination = ?,
             start_date = ?,
             end_date = ?
         WHERE id = ? AND company_id = ?`,
        [
            data.vehicle_id,
            data.driver_id,
            data.helper_id || null,
            data.bilty_id || null,
            data.client_id || null,
            data.source,
            data.destination,
            data.start_date || null,
            data.end_date || null,
            id,
            companyId
        ]
    );

    return result.affectedRows;
};

const updateTripStatus = async (id, companyId, status, executor = db) => {
    const [result] = await executor.execute(
        `UPDATE trips
         SET status = ?
         WHERE id = ? AND company_id = ?`,
        [status, id, companyId]
    );

    return result.affectedRows;
};

const recordCompletedTripAssignment = async (trip, executor = db) => {
    await executor.execute(
        `INSERT IGNORE INTO vehicle_trip_assignment_history
        (
            company_id,
            trip_id,
            vehicle_id,
            driver_id,
            helper_id,
            trip_start_date,
            trip_end_date,
            completed_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
            trip.company_id,
            trip.id,
            trip.vehicle_id,
            trip.driver_id,
            trip.helper_id || null,
            trip.start_date || null,
            trip.end_date || null
        ]
    );
};

const getVehicleTripAssignmentHistory = async (companyId, vehicleId, pagination) =>
    paginatedSelect(db, {
        table: "vehicle_trip_assignment_history",
        columns: `id, company_id, trip_id, vehicle_id, driver_id, helper_id,
                  trip_start_date, trip_end_date, completed_at`,
        where: "company_id = ? AND vehicle_id = ?",
        params: [companyId, vehicleId],
        pagination
    });

module.exports = {
    getTrips,
    getTripById,
    getAssignedTrips,
    createTrip,
    updateTrip,
    updateTripStatus,
    recordCompletedTripAssignment,
    getVehicleTripAssignmentHistory
};
