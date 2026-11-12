const db = require("../config/db");
const { paginatedSelect } = require("../utils/pagination");
const { buildListWhere } = require("../utils/queryFilters");
const { HttpError } = require("../utils/httpError");
const { VEHICLE_STATUSES, vehicleStatus } = require("../utils/vehicleValidation");

const VEHICLE_COLUMNS = `id, company_id, vehicle_type_id, registration_no,
                         make, model, capacity, ownership, status,
                         CASE
                           WHEN status = 2 THEN 'MAINTENANCE'
                           WHEN status = 0 THEN 'UNAVAILABLE'
                           WHEN EXISTS (
                             SELECT 1 FROM trips t
                             WHERE t.company_id = vehicles.company_id
                               AND t.vehicle_id = vehicles.id
                               AND t.status NOT IN ('COMPLETED', 'CANCELLED')
                           ) THEN 'ON_TRIP'
                           WHEN EXISTS (
                             SELECT 1 FROM vehicle_assignments va
                             WHERE va.company_id = vehicles.company_id
                               AND va.vehicle_id = vehicles.id
                               AND va.is_active = 1
                               AND va.start_date <= CURDATE()
                               AND (va.end_date IS NULL OR va.end_date >= CURDATE())
                           ) THEN 'ASSIGNED'
                           ELSE 'AVAILABLE'
                         END AS availability_status,
                         created_at, updated_at`;
const QUALIFIED_VEHICLE_COLUMNS = `v.id, v.company_id, v.vehicle_type_id,
                                  v.registration_no, v.make, v.model, v.capacity,
                                  v.ownership, v.status,
                                  CASE
                                    WHEN v.status = 2 THEN 'MAINTENANCE'
                                    WHEN v.status = 0 THEN 'UNAVAILABLE'
                                    WHEN EXISTS (
                                      SELECT 1 FROM trips t
                                      WHERE t.company_id = v.company_id
                                        AND t.vehicle_id = v.id
                                        AND t.status NOT IN ('COMPLETED', 'CANCELLED')
                                    ) THEN 'ON_TRIP'
                                    WHEN EXISTS (
                                      SELECT 1 FROM vehicle_assignments va
                                      WHERE va.company_id = v.company_id
                                        AND va.vehicle_id = v.id
                                        AND va.is_active = 1
                                        AND va.start_date <= CURDATE()
                                        AND (va.end_date IS NULL OR va.end_date >= CURDATE())
                                    ) THEN 'ASSIGNED'
                                    ELSE 'AVAILABLE'
                                  END AS availability_status,
                                  v.created_at, v.updated_at`;

const getVehicles = async (companyId, pagination, filters = {}) => {
    const listFilters = { ...filters };
    const selectedStatus = listFilters.status;
    delete listFilters.status;

    const { where: baseWhere, params } = buildListWhere({
        companyId,
        filters: listFilters,
        searchColumns: ["registration_no"]
    });
    const where = [baseWhere];

    if (selectedStatus !== undefined && selectedStatus !== "") {
        where.push("status = ?");
        params.push(vehicleStatus(selectedStatus));
    }

    return paginatedSelect(db, {
        table: "vehicles",
        columns: VEHICLE_COLUMNS,
        where: where.filter(Boolean).join(" AND "),
        params,
        pagination
    });
};

const getVehicleById = async (id, companyId, executor = db) => {
    const [rows] = await executor.execute(
        `SELECT ${VEHICLE_COLUMNS}
         FROM vehicles
         WHERE id = ? AND company_id = ?
         LIMIT 1`,
        [id, companyId]
    );

    return rows[0] || null;
};

const createVehicle = async (companyId, data, executor = db) => {
    const [result] = await executor.execute(
        `INSERT INTO vehicles
        (
            company_id,
            vehicle_type_id,
            registration_no,
            make,
            model,
            capacity,
            ownership,
            status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            companyId,
            data.vehicle_type_id,
            data.registration_no,
            data.make,
            data.model,
            data.capacity,
            data.ownership,
            vehicleStatus(data.status)
        ]
    );

    return result.insertId;
};

const assertVehicleCanBeInactive = async (id, companyId, executor) => {
    const [vehicleRows] = await executor.execute(
        `SELECT id
         FROM vehicles
         WHERE id = ? AND company_id = ?
         LIMIT 1
         FOR UPDATE`,
        [id, companyId]
    );
    if (!vehicleRows[0]) {
        throw new HttpError(404, "Vehicle not found");
    }

    const [tripRows] = await executor.execute(
        `SELECT id
         FROM trips
         WHERE company_id = ?
           AND vehicle_id = ?
           AND status NOT IN ('COMPLETED', 'CANCELLED')
         LIMIT 1`,
        [companyId, id]
    );
    const [assignmentRows] = await executor.execute(
        `SELECT id
         FROM vehicle_assignments
         WHERE company_id = ?
           AND vehicle_id = ?
           AND is_active = 1
           AND (end_date IS NULL OR end_date >= CURDATE())
         LIMIT 1`,
        [companyId, id]
    );

    if (tripRows[0] || assignmentRows[0]) {
        throw new HttpError(
            409,
            "Vehicle cannot be made inactive while it has an active trip or assignment"
        );
    }
};

const updateVehicle = async (id, companyId, data, executor = db) => {
    const status = vehicleStatus(data.status);
    if (status === VEHICLE_STATUSES.INACTIVE) {
        await assertVehicleCanBeInactive(id, companyId, executor);
    }

    const [result] = await executor.execute(
        `UPDATE vehicles
         SET vehicle_type_id = ?,
             registration_no = ?,
             make = ?,
             model = ?,
             capacity = ?,
             ownership = ?,
             status = ?
         WHERE id = ? AND company_id = ?`,
        [
            data.vehicle_type_id,
            data.registration_no,
            data.make,
            data.model,
            data.capacity,
            data.ownership,
            status,
            id,
            companyId
        ]
    );

    return result.affectedRows;
};

const deactivateVehicle = async (id, companyId, executor = db) => {
    await assertVehicleCanBeInactive(id, companyId, executor);
    const [result] = await executor.execute(
        `UPDATE vehicles
         SET status = ?
         WHERE id = ? AND company_id = ?`,
        [VEHICLE_STATUSES.INACTIVE, id, companyId]
    );

    return result.affectedRows;
};

const getMyAssignedVehicle = async (user, executor = db) => {
    const isDriver = user.user_type === "DRIVER";
    const relationTable = isDriver ? "drivers" : "helpers";
    const relationIdColumn = isDriver ? "driver_id" : "helper_id";
    const [rows] = await executor.execute(
        `SELECT ${QUALIFIED_VEHICLE_COLUMNS},
                va.start_date AS assignment_start_date,
                va.end_date AS assignment_end_date
         FROM ${relationTable} person
         INNER JOIN vehicle_assignments va
            ON va.company_id = person.company_id
           AND va.${relationIdColumn} = person.id
         INNER JOIN vehicles v
            ON v.company_id = va.company_id
           AND v.id = va.vehicle_id
         WHERE person.company_id = ?
           AND person.mobile = ?
           AND person.status = 1
           AND (
                SELECT COUNT(*)
                FROM ${relationTable} matched_person
                WHERE matched_person.company_id = person.company_id
                  AND matched_person.mobile = person.mobile
                  AND matched_person.status = 1
           ) = 1
           AND va.is_active = 1
           AND va.start_date <= CURDATE()
           AND (va.end_date IS NULL OR va.end_date >= CURDATE())
         ORDER BY va.start_date DESC, va.id DESC
         LIMIT 2`,
        [user.company_id, user.mobile]
    );

    if (rows.length > 1) {
        throw new HttpError(
            409,
            "Multiple active vehicle assignments found for this mobile user"
        );
    }
    return rows[0] || null;
};

module.exports = {
    getVehicles,
    getVehicleById,
    createVehicle,
    updateVehicle,
    deactivateVehicle,
    getMyAssignedVehicle
};
