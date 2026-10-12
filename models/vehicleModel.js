const db = require("../config/db");

const getVehicles = async (companyId) => {
    const [rows] = await db.execute(
        `SELECT id,
                company_id,
                vehicle_type_id,
                registration_no,
                capacity,
                status,
                created_at,
                updated_at
         FROM vehicles
         WHERE company_id = ?
         ORDER BY id DESC`,
        [companyId]
    );

    return rows;
};

const createVehicle = async (
    companyId,
    vehicleTypeId,
    registrationNo,
    capacity,
    status
) => {
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
            vehicleTypeId,
            registrationNo,
            capacity || null,
            status || 1
        ]
    );

    return result.insertId;
};

module.exports = {
    getVehicles,
    createVehicle
};
