const db = require("../config/db");
const { paginatedSelect } = require("../utils/pagination");
const { HttpError } = require("../utils/httpError");
const invoicePaymentModel = require("./invoicePaymentModel");

const createDeduction = async (data) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const [paymentRows] = await connection.execute(
            `SELECT *
             FROM invoice_payments
             WHERE id = ? AND company_id = ?
             LIMIT 1 FOR UPDATE`,
            [data.invoice_payment_id, data.company_id]
        );

        const payment = paymentRows[0];

        if (!payment) {
            throw new HttpError(400, "Invoice payment not found for this company");
        }

        if (payment.status !== "PENDING") {
            throw new HttpError(
                400,
                "Deductions can only be added to pending payments"
            );
        }

        const [result] = await connection.execute(
            `INSERT INTO invoice_payment_deductions
            (
                company_id,
                invoice_payment_id,
                deduction_type,
                amount,
                remarks
            )
            VALUES (?, ?, ?, ?, ?)`,
            [
                data.company_id,
                data.invoice_payment_id,
                data.deduction_type,
                data.amount,
                data.remarks || null
            ]
        );

        await invoicePaymentModel.recalcHeaderTotals(
            connection,
            data.invoice_payment_id,
            data.company_id
        );

        await connection.commit();

        return result.insertId;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const getDeductions = async (companyId, pagination) => {
    return paginatedSelect(db, {
        table: "invoice_payment_deductions",
        columns: "*",
        where: "company_id = ?",
        params: [companyId],
        pagination
    });
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
