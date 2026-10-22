const db = require("../config/db");
const { paginatedSelect } = require("../utils/pagination");
const { toTinyIntStatus } = require("../utils/validation");

const getVehicleTypes = async (pagination) => {
    return paginatedSelect(db, {
        table: "vehicle_types",
        columns: `id, name, status, created_at, updated_at`,
        orderBy: "id ASC",
        pagination
    });
};

const createVehicleType = async (name, status = 1) => {
    const [result] = await db.execute(
        `INSERT INTO vehicle_types
        (name, status)
        VALUES (?, ?)`,
        [name, toTinyIntStatus(status, 1)]
    );

    return result.insertId;
};

module.exports = {
    getVehicleTypes,
    createVehicleType
};
