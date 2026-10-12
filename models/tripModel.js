const db = require("../config/db");

const getTrips = async (companyId) => {
    const [rows] = await db.execute(
        `SELECT
            id,
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
            status,
            created_at,
            updated_at
         FROM trips
         WHERE company_id = ?
         ORDER BY id DESC`,
        [companyId]
    );

    return rows;
};

const createTrip = async (
    companyId,
    vehicleId,
    driverId,
    helperId,
    biltyId,
    clientId,
    source,
    destination,
    startDate,
    endDate,
    status
) => {
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
            vehicleId,
            driverId,
            helperId || null,
            biltyId || null,
            clientId || null,
            source,
            destination,
            startDate || null,
            endDate || null,
            status || "CREATED"
        ]
    );

    return result.insertId;
};

module.exports = {
    getTrips,
    createTrip
};
