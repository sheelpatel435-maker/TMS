const db = require("../config/db");

const getVehicleAssignments = async (companyId) => {
    const [rows] = await db.execute(
        `SELECT
            id,
            company_id,
            vehicle_id,
            driver_id,
            helper_id,
            start_date,
            end_date,
            is_active,
            created_at,
            updated_at
         FROM vehicle_assignments
         WHERE company_id = ?
         ORDER BY id DESC`,
        [companyId]
    );

    return rows;
};

const createVehicleAssignment = async (
    companyId,
    vehicleId,
    driverId,
    helperId,
    startDate,
    endDate,
    isActive
) => {
    const [result] = await db.execute(
        `INSERT INTO vehicle_assignments
        (
            company_id,
            vehicle_id,
            driver_id,
            helper_id,
            start_date,
            end_date,
            is_active
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
            companyId,
            vehicleId,
            driverId || null,
            helperId || null,
            startDate,
            endDate || null,
            isActive ?? 1
        ]
    );

    return result.insertId;
};

module.exports = {
    getVehicleAssignments,
    createVehicleAssignment
};
