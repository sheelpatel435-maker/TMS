const db = require("../config/db");
const { paginatedSelect } = require("../utils/pagination");
const { roundMoney } = require("../utils/validation");
const { HttpError } = require("../utils/httpError");
const { assertTransition } = require("../utils/statusTransitions");
const invoiceModel = require("./invoiceModel");

const createPayment = async (data) => {
    const [result] = await db.execute(
        `INSERT INTO invoice_payments
        (
            company_id,
            invoice_id,
            payment_date,
            gross_amount,
            deduction_amount,
            net_received_amount,
            payment_method,
            reference_no,
            status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
        [
            data.company_id,
            data.invoice_id,
            data.payment_date,
            data.gross_amount,
            data.deduction_amount,
            data.net_received_amount,
            data.payment_method,
            data.reference_no || null
        ]
    );

    return result.insertId;
};

const getPayments = async (companyId, pagination) => {
    return paginatedSelect(db, {
        table: "invoice_payments",
        columns: "*",
        where: "company_id = ?",
        params: [companyId],
        pagination
    });
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

const recalcHeaderTotals = async (connection, paymentId, companyId) => {
    const [sumRows] = await connection.execute(
        `SELECT COALESCE(SUM(amount), 0) AS deduction_amount
         FROM invoice_payment_deductions
         WHERE invoice_payment_id = ? AND company_id = ?`,
        [paymentId, companyId]
    );

    const [paymentRows] = await connection.execute(
        `SELECT *
         FROM invoice_payments
         WHERE id = ? AND company_id = ?
         LIMIT 1`,
        [paymentId, companyId]
    );

    const payment = paymentRows[0];

    if (!payment) {
        throw new HttpError(404, "Payment not found");
    }

    const deductionAmount = roundMoney(sumRows[0].deduction_amount);
    const netReceived = roundMoney(Number(payment.gross_amount) - deductionAmount);

    await connection.execute(
        `UPDATE invoice_payments
         SET deduction_amount = ?,
             net_received_amount = ?
         WHERE id = ? AND company_id = ?`,
        [deductionAmount, netReceived < 0 ? 0 : netReceived, paymentId, companyId]
    );

    return {
        ...payment,
        deduction_amount: deductionAmount,
        net_received_amount: netReceived < 0 ? 0 : netReceived
    };
};

const updateStatus = async (id, companyId, status) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const [paymentRows] = await connection.execute(
            `SELECT *
             FROM invoice_payments
             WHERE id = ? AND company_id = ?
             LIMIT 1 FOR UPDATE`,
            [id, companyId]
        );

        const payment = paymentRows[0];

        if (!payment) {
            throw new HttpError(404, "Payment not found");
        }

        const nextStatus = status === "REVERSED" ? "CANCELLED" : status;

        assertTransition("payment", payment.status, nextStatus);

        const [invoiceRows] = await connection.execute(
            `SELECT *
             FROM invoices
             WHERE id = ? AND company_id = ?
             LIMIT 1 FOR UPDATE`,
            [payment.invoice_id, companyId]
        );

        const invoice = invoiceRows[0];

        if (!invoice) {
            throw new HttpError(400, "Invoice not found for this company");
        }

        await connection.execute(
            `UPDATE invoice_payments
             SET status = ?
             WHERE id = ? AND company_id = ?`,
            [nextStatus, id, companyId]
        );

        if (payment.status === "PENDING" && nextStatus === "CONFIRMED") {
            await invoiceModel.applyPaymentToBalance(
                connection,
                invoice,
                payment.net_received_amount,
                "credit"
            );
        }

        if (payment.status === "CONFIRMED" && nextStatus === "CANCELLED") {
            await invoiceModel.applyPaymentToBalance(
                connection,
                invoice,
                payment.net_received_amount,
                "debit"
            );
        }

        await connection.commit();

        return 1;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

module.exports = {
    createPayment,
    getPayments,
    getPaymentById,
    recalcHeaderTotals,
    updateStatus
};
