const db = require("../config/db");
const { paginatedSelect } = require("../utils/pagination");
const { toTinyIntStatus } = require("../utils/validation");

const getVehicles = async (companyId, pagination) => {
    return paginatedSelect(db, {
        table: "vehicles",
        columns: `id, company_id, vehicle_type_id, registration_no, capacity, status, created_at, updated_at`,
        where: "company_id = ?",
        params: [companyId],
        pagination
    });
};

const createVehicle = async (companyId, data) => {
    const [result] = await db.execute(
        `INSERT INTO vehicles
        (
            company_id,
            vehicle_type_id,
            registration_no,
            capacity,
            status
        )
        VALUES (?, ?, ?, ?, ?)`,
        [
            companyId,
            data.vehicle_type_id,
            data.registration_no,
            data.capacity || null,
            toTinyIntStatus(data.status, 1)
        ]
    );

    return result.insertId;
};

module.exports = {
    getVehicles,
    createVehicle
};
