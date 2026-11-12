const db = require("../config/db");
const { paginatedSelect } = require("../utils/pagination");
const { buildListWhere } = require("../utils/queryFilters");

const BILTY_COLUMNS = `id, company_id, bilty_number, client_id, status, trip_id,
                  goods_description, weight_kg, packages, consignor, consignee,
                  pickup_location, drop_location, created_at, updated_at`;

const getBilties = async (companyId, pagination, filters = {}) => {
    const { where, params } = buildListWhere({
        companyId,
        filters,
        searchColumns: ["bilty_number", "goods_description", "consignor", "consignee"]
    });

    return paginatedSelect(db, {
        table: "bilties",
        columns: BILTY_COLUMNS,
        where,
        params,
        pagination
    });
};

const getBiltyById = async (id, companyId) => {
    const [rows] = await db.execute(
        `SELECT ${BILTY_COLUMNS}
         FROM bilties
         WHERE id = ? AND company_id = ?
         LIMIT 1`,
        [id, companyId]
    );

    return rows[0] || null;
};

const findByNumber = async (companyId, biltyNumber) => {
    const [rows] = await db.execute(
        `SELECT id
         FROM bilties
         WHERE company_id = ? AND bilty_number = ?
         LIMIT 1`,
        [companyId, biltyNumber]
    );

    return rows[0] || null;
};

const createBilty = async (companyId, data) => {
    const [result] = await db.execute(
        `INSERT INTO bilties
        (
            company_id,
            bilty_number,
            client_id,
            status,
            trip_id,
            goods_description,
            weight_kg,
            packages,
            consignor,
            consignee,
            pickup_location,
            drop_location
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            companyId,
            data.bilty_number,
            data.client_id || null,
            data.status || "DRAFT",
            data.trip_id || null,
            data.goods_description || null,
            data.weight_kg || null,
            data.packages || null,
            data.consignor || null,
            data.consignee || null,
            data.pickup_location || null,
            data.drop_location || null
        ]
    );

    return result.insertId;
};

const updateBilty = async (id, companyId, data) => {
    const [result] = await db.execute(
        `UPDATE bilties
         SET client_id = ?,
             status = ?,
             trip_id = ?,
             goods_description = ?,
             weight_kg = ?,
             packages = ?,
             consignor = ?,
             consignee = ?,
             pickup_location = ?,
             drop_location = ?
         WHERE id = ? AND company_id = ?`,
        [
            data.client_id || null,
            data.status || "DRAFT",
            data.trip_id || null,
            data.goods_description || null,
            data.weight_kg || null,
            data.packages || null,
            data.consignor || null,
            data.consignee || null,
            data.pickup_location || null,
            data.drop_location || null,
            id,
            companyId
        ]
    );

    return result.affectedRows;
};

const deactivateBilty = async (id, companyId) => {
    const [result] = await db.execute(
        `UPDATE bilties
         SET status = 'CANCELLED'
         WHERE id = ? AND company_id = ?
         AND status NOT IN ('USED', 'COMPLETED')`,
        [id, companyId]
    );

    return result.affectedRows;
};

module.exports = {
    getBilties,
    getBiltyById,
    findByNumber,
    createBilty,
    updateBilty,
    deactivateBilty
};
