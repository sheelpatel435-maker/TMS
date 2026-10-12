const db = require("../config/db");

const createDeduction = async (data) => {
    const [result] = await db.execute(
        `INSERT INTO invoice_payment_deductions
        (
            company_id,
            invoice_payment_id,
            deduction_type,
            deduction_rate,
            amount,
            remarks
        )
        VALUES (?, ?, ?, ?, ?, ?)`,
        [
            data.company_id,
            data.invoice_payment_id,
            data.deduction_type,
            data.deduction_rate,
            data.amount,
            data.remarks
        ]
    );

    return result.insertId;
};

const getDeductions = async (companyId) => {
    const [rows] = await db.execute(
        `SELECT *
         FROM invoice_payment_deductions
         WHERE company_id = ?
         ORDER BY id DESC`,
        [companyId]
    );

    return rows;
};

const getDeductionById = async (id, companyId) => {
    const [rows] = await db.execute(
        `SELECT *
         FROM invoice_payment_deductions
         WHERE id = ? AND company_id = ?
         LIMIT 1`,
        [id, companyId]
    );

    return rows[0];
};

module.exports = {
    createDeduction,
    getDeductions,
    getDeductionById
};
