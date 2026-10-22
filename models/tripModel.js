const db = require("../config/db");
const { paginatedSelect } = require("../utils/pagination");

const getTrips = async (companyId, pagination) => {
    return paginatedSelect(db, {
        table: "trips",
        columns: `id, company_id, vehicle_id, driver_id, helper_id, bilty_id, client_id,
                  source, destination, start_date, end_date, status, created_at, updated_at`,
        where: "company_id = ?",
        params: [companyId],
        pagination
    });
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
            data.status || "CREATED"
        ]
    );

    return result.insertId;
};

module.exports = {
    getTrips,
    createTrip
};
