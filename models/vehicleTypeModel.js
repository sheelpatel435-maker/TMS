const db = require("../config/db");

const getVehicleTypes = async () => {
    const [rows] = await db.execute(
        `SELECT
            id,
            name,
            status,
            created_at,
            updated_at
         FROM vehicle_types
         ORDER BY id ASC`
    );

    return rows;
};

const createVehicleType = async (name, status = 1) => {
    const [result] = await db.execute(
        `INSERT INTO vehicle_types
        (name, status)
        VALUES (?, ?)`,
        [name, status]
    );

    return result.insertId;
};

module.exports = {
    getVehicleTypes,
    createVehicleType
};
