const db = require("../config/db");

const createPayment = async (data) => {
    const [result] = await db.execute(
        `INSERT INTO invoice_payments
        (
            company_id,
            invoice_id,
            payment_reference,
            payment_date,
            amount,
            gross_payment_amount,
            deduction_amount,
            net_received_amount,
            payment_method,
            bank_reference,
            remarks,
            status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
        [
            data.company_id,
            data.invoice_id,
            data.payment_reference,
            data.payment_date,
            data.amount,
            data.gross_payment_amount,
            data.deduction_amount,
            data.net_received_amount,
            data.payment_method,
            data.bank_reference,
            data.remarks
        ]
    );

    return result.insertId;
};

const getPayments = async (companyId) => {
    const [rows] = await db.execute(
        `SELECT *
         FROM invoice_payments
         WHERE company_id = ?
         ORDER BY id DESC`,
        [companyId]
    );

    return rows;
};

const getPaymentById = async (id, companyId) => {
    const [rows] = await db.execute(
        `SELECT *
         FROM invoice_payments
         WHERE id = ? AND company_id = ?
         LIMIT 1`,
        [id, companyId]
    );

    return rows[0];
};

const updateStatus = async (
    id,
    companyId,
    status,
    confirmedBy
) => {
    const [result] = await db.execute(
        `UPDATE invoice_payments
         SET status = ?,
             confirmed_by = ?,
             confirmed_at = CURRENT_TIMESTAMP
         WHERE id = ? AND company_id = ?`,
        [status, confirmedBy, id, companyId]
    );

    return result.affectedRows;
};

module.exports = {
    createPayment,
    getPayments,
    getPaymentById,
    updateStatus
};
