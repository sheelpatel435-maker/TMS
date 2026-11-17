const db = require("../config/db");
const { paginatedSelect } = require("../utils/pagination");
const { buildListWhere } = require("../utils/queryFilters");
const { roundMoney } = require("../utils/validation");

const BILTY_COLUMNS = `id, company_id, bilty_number, bilty_date, copy_type,
                  client_id, status, trip_id, vehicle_id, truck_no,
                  goods_description, weight_kg, charged_weight_kg, packages, packages_label,
                  rate_remark, freight_amount, total_amount,
                  consignor, consignor_address, consignee, consignee_address,
                  pickup_location, drop_location,
                  invoice_no, invoice_value, payment_mode, gst_payer, delivery_type,
                  insurance_at_risk, insurance_company, insurance_policy_no,
                  insurance_date, insurance_amount, terms_notes,
                  created_at, updated_at`;

const CHARGE_COLUMNS = `id, company_id, bilty_id, charge_type, amount, created_at, updated_at`;

const getBilties = async (companyId, pagination, filters = {}) => {
    const { where, params } = buildListWhere({
        companyId,
        filters,
        searchColumns: [
            "bilty_number",
            "goods_description",
            "consignor",
            "consignee",
            "truck_no",
            "invoice_no"
        ]
    });

    return paginatedSelect(db, {
        table: "bilties",
        columns: BILTY_COLUMNS,
        where,
        params,
        pagination
    });
};

const getBiltyById = async (id, companyId, executor = db) => {
    const [rows] = await executor.execute(
        `SELECT ${BILTY_COLUMNS}
         FROM bilties
         WHERE id = ? AND company_id = ?
         LIMIT 1`,
        [id, companyId]
    );

    return rows[0] || null;
};

const getBiltyCharges = async (biltyId, companyId, executor = db) => {
    const [rows] = await executor.execute(
        `SELECT ${CHARGE_COLUMNS}
         FROM bilty_charges
         WHERE bilty_id = ? AND company_id = ?
         ORDER BY id ASC`,
        [biltyId, companyId]
    );
    return rows;
};

const getBiltyWithCharges = async (id, companyId, executor = db) => {
    const bilty = await getBiltyById(id, companyId, executor);
    if (!bilty) return null;
    const charges = await getBiltyCharges(id, companyId, executor);
    return { ...bilty, charges };
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

const biltyInsertValues = (companyId, data) => [
    companyId,
    data.bilty_number,
    data.bilty_date || null,
    data.copy_type || "CONSIGNOR",
    data.client_id || null,
    data.status || "DRAFT",
    data.trip_id || null,
    data.vehicle_id || null,
    data.truck_no || null,
    data.goods_description || null,
    data.weight_kg || null,
    data.charged_weight_kg || null,
    data.packages || null,
    data.packages_label || null,
    data.rate_remark || null,
    data.freight_amount == null ? null : roundMoney(data.freight_amount),
    data.total_amount == null ? null : roundMoney(data.total_amount),
    data.consignor || null,
    data.consignor_address || null,
    data.consignee || null,
    data.consignee_address || null,
    data.pickup_location || null,
    data.drop_location || null,
    data.invoice_no || null,
    data.invoice_value || null,
    data.payment_mode || null,
    data.gst_payer || null,
    data.delivery_type || null,
    data.insurance_at_risk || null,
    data.insurance_company || null,
    data.insurance_policy_no || null,
    data.insurance_date || null,
    data.insurance_amount == null ? null : roundMoney(data.insurance_amount),
    data.terms_notes || null
];

const createBilty = async (companyId, data, executor = db) => {
    const [result] = await executor.execute(
        `INSERT INTO bilties
        (
            company_id,
            bilty_number,
            bilty_date,
            copy_type,
            client_id,
            status,
            trip_id,
            vehicle_id,
            truck_no,
            goods_description,
            weight_kg,
            charged_weight_kg,
            packages,
            packages_label,
            rate_remark,
            freight_amount,
            total_amount,
            consignor,
            consignor_address,
            consignee,
            consignee_address,
            pickup_location,
            drop_location,
            invoice_no,
            invoice_value,
            payment_mode,
            gst_payer,
            delivery_type,
            insurance_at_risk,
            insurance_company,
            insurance_policy_no,
            insurance_date,
            insurance_amount,
            terms_notes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        biltyInsertValues(companyId, data)
    );

    return result.insertId;
};

const replaceBiltyCharges = async (companyId, biltyId, charges, executor = db) => {
    await executor.execute(
        `DELETE FROM bilty_charges WHERE company_id = ? AND bilty_id = ?`,
        [companyId, biltyId]
    );

    if (!Array.isArray(charges) || !charges.length) {
        return [];
    }

    for (const charge of charges) {
        const chargeType = String(charge.charge_type || "").trim().toUpperCase();
        if (!chargeType) continue;
        await executor.execute(
            `INSERT INTO bilty_charges (company_id, bilty_id, charge_type, amount)
             VALUES (?, ?, ?, ?)`,
            [
                companyId,
                biltyId,
                chargeType,
                roundMoney(charge.amount == null ? 0 : charge.amount)
            ]
        );
    }

    return getBiltyCharges(biltyId, companyId, executor);
};

const updateBilty = async (id, companyId, data, executor = db) => {
    const [result] = await executor.execute(
        `UPDATE bilties
         SET bilty_date = ?,
             copy_type = ?,
             client_id = ?,
             status = ?,
             trip_id = ?,
             vehicle_id = ?,
             truck_no = ?,
             goods_description = ?,
             weight_kg = ?,
             charged_weight_kg = ?,
             packages = ?,
             packages_label = ?,
             rate_remark = ?,
             freight_amount = ?,
             total_amount = ?,
             consignor = ?,
             consignor_address = ?,
             consignee = ?,
             consignee_address = ?,
             pickup_location = ?,
             drop_location = ?,
             invoice_no = ?,
             invoice_value = ?,
             payment_mode = ?,
             gst_payer = ?,
             delivery_type = ?,
             insurance_at_risk = ?,
             insurance_company = ?,
             insurance_policy_no = ?,
             insurance_date = ?,
             insurance_amount = ?,
             terms_notes = ?
         WHERE id = ? AND company_id = ?`,
        [
            data.bilty_date || null,
            data.copy_type || "CONSIGNOR",
            data.client_id || null,
            data.status || "DRAFT",
            data.trip_id || null,
            data.vehicle_id || null,
            data.truck_no || null,
            data.goods_description || null,
            data.weight_kg || null,
            data.charged_weight_kg || null,
            data.packages || null,
            data.packages_label || null,
            data.rate_remark || null,
            data.freight_amount == null ? null : roundMoney(data.freight_amount),
            data.total_amount == null ? null : roundMoney(data.total_amount),
            data.consignor || null,
            data.consignor_address || null,
            data.consignee || null,
            data.consignee_address || null,
            data.pickup_location || null,
            data.drop_location || null,
            data.invoice_no || null,
            data.invoice_value || null,
            data.payment_mode || null,
            data.gst_payer || null,
            data.delivery_type || null,
            data.insurance_at_risk || null,
            data.insurance_company || null,
            data.insurance_policy_no || null,
            data.insurance_date || null,
            data.insurance_amount == null ? null : roundMoney(data.insurance_amount),
            data.terms_notes || null,
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
    getBiltyCharges,
    getBiltyWithCharges,
    findByNumber,
    createBilty,
    replaceBiltyCharges,
    updateBilty,
    deactivateBilty
};
