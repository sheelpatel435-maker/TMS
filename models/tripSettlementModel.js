const db = require("../config/db");

const createSettlement = async (data) => {
    const [result] = await db.execute(
        `INSERT INTO trip_settlements
        (
            company_id,
            trip_id,
            settlement_no,
            total_advance,
            total_approved_expense,
            carry_forward_in,
            net_balance,
            settlement_type,
            settlement_amount,
            prepared_by,
            status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT')`,
        [
            data.company_id,
            data.trip_id,
            data.settlement_no,
            data.total_advance,
            data.total_approved_expense,
            data.carry_forward_in,
            data.net_balance,
            data.settlement_type,
            data.settlement_amount,
            data.prepared_by
        ]
    );

    return result.insertId;
};

const getSettlements = async (companyId) => {
    const [rows] = await db.execute(
        `SELECT *
         FROM trip_settlements
         WHERE company_id = ?
         ORDER BY id DESC`,
        [companyId]
    );

    return rows;
};

const getSettlementById = async (id, companyId) => {
    const [rows] = await db.execute(
        `SELECT *
         FROM trip_settlements
         WHERE id = ? AND company_id = ?
         LIMIT 1`,
        [id, companyId]
    );

    return rows[0];
};

const updateStatus = async (id, companyId, status, approvedBy) => {
    const [result] = await db.execute(
        `UPDATE trip_settlements
         SET status = ?,
             approved_by = ?,
             settlement_date = CURRENT_TIMESTAMP
         WHERE id = ? AND company_id = ?`,
        [status, approvedBy, id, companyId]
    );

    return result.affectedRows;
};

module.exports = {
    createSettlement,
    getSettlements,
    getSettlementById,
    updateStatus
};
