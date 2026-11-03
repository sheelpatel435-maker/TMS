const db = require("../config/db");

const getStopsByTrip = async (tripId, companyId) => {
    const [rows] = await db.execute(
        `SELECT id, company_id, trip_id, sequence, city, address, eta, status,
                created_at, updated_at
         FROM trip_stops
         WHERE trip_id = ? AND company_id = ?
         ORDER BY sequence ASC, id ASC`,
        [tripId, companyId]
    );

    return rows;
};

const replaceStops = async (companyId, tripId, stops = []) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        await connection.execute(
            `DELETE FROM trip_stops
             WHERE trip_id = ? AND company_id = ?`,
            [tripId, companyId]
        );

        for (let index = 0; index < stops.length; index += 1) {
            const stop = stops[index];

            await connection.execute(
                `INSERT INTO trip_stops
                (company_id, trip_id, sequence, city, address, eta, status)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    companyId,
                    tripId,
                    stop.sequence ?? index + 1,
                    stop.city,
                    stop.address || null,
                    stop.eta || null,
                    stop.status || "PENDING"
                ]
            );
        }

        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

module.exports = {
    getStopsByTrip,
    replaceStops
};
