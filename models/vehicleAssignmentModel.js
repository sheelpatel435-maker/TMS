const db = require("../config/db");
const { paginatedSelect } = require("../utils/pagination");

const getVehicleAssignments = async (companyId, pagination) => {
    return paginatedSelect(db, {
        table: "vehicle_assignments",
        columns: `id, company_id, vehicle_id, driver_id, helper_id, start_date,
                  end_date, is_active, created_at, updated_at`,
        where: "company_id = ?",
        params: [companyId],
        pagination
    });
};

const createVehicleAssignment = async (companyId, data) => {
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
            data.vehicle_id,
            data.driver_id || null,
            data.helper_id || null,
            data.start_date,
            data.end_date || null,
            data.is_active ?? 1
        ]
    );

    return result.insertId;
};

module.exports = {
    getVehicleAssignments,
    createVehicleAssignment
};
