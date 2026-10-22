const db = require("../config/db");
const { paginatedSelect } = require("../utils/pagination");
const { roundMoney } = require("../utils/validation");

const createInvoice = async (data) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const [invoiceResult] = await connection.execute(
            `INSERT INTO invoices
            (
                company_id,
                client_id,
                invoice_number,
                invoice_date,
                taxable_amount,
                subtotal,
                tax_amount,
                total_amount,
                deduction_amount,
                balance_amount,
                status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT')`,
            [
                data.company_id,
                data.client_id,
                data.invoice_number,
                data.invoice_date,
                data.taxable_amount,
                data.subtotal,
                data.tax_amount,
                data.total_amount,
                data.deduction_amount,
                data.balance_amount
            ]
        );

        const invoiceId = invoiceResult.insertId;

        if (Array.isArray(data.items)) {
            for (const item of data.items) {
                await connection.execute(
                    `INSERT INTO invoice_items
                    (
                        company_id,
                        invoice_id,
                        trip_id,
                        bilty_id,
                        description,
                        freight,
                        detention,
                        hamali,
                        other_charges,
                        item_total
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        data.company_id,
                        invoiceId,
                        item.trip_id || null,
                        item.bilty_id || null,
                        item.description || null,
                        item.freight || 0,
                        item.detention || 0,
                        item.hamali || 0,
                        item.other_charges || 0,
                        item.item_total || 0
                    ]
                );
            }
        }

        await connection.commit();

        return invoiceId;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const getInvoices = async (companyId, pagination) => {
    return paginatedSelect(db, {
        table: "invoices",
        columns: "*",
        where: "company_id = ?",
        params: [companyId],
        pagination
    });
};

const getInvoiceById = async (id, companyId) => {
    const [invoiceRows] = await db.execute(
        `SELECT *
         FROM invoices
         WHERE id = ? AND company_id = ?
         LIMIT 1`,
        [id, companyId]
    );

    if (!invoiceRows[0]) {
        return null;
    }

    const [items] = await db.execute(
        `SELECT *
         FROM invoice_items
         WHERE invoice_id = ? AND company_id = ?
         ORDER BY id ASC`,
        [id, companyId]
    );

    return {
        ...invoiceRows[0],
        items
    };
};

const findByNumber = async (companyId, invoiceNumber) => {
    const [rows] = await db.execute(
        `SELECT id
         FROM invoices
         WHERE company_id = ? AND invoice_number = ?
         LIMIT 1`,
        [companyId, invoiceNumber]
    );

    return rows[0] || null;
};

const updateStatus = async (id, companyId, status) => {
    const [result] = await db.execute(
        `UPDATE invoices
         SET status = ?
         WHERE id = ? AND company_id = ?`,
        [status, id, companyId]
    );

    return result.affectedRows;
};

const applyPaymentToBalance = async (connection, invoice, netAmount, direction) => {
    const delta = direction === "credit" ? -roundMoney(netAmount) : roundMoney(netAmount);
    const nextBalance = roundMoney(Number(invoice.balance_amount) + delta);
    const safeBalance = nextBalance < 0 ? 0 : nextBalance;
    const total = roundMoney(invoice.total_amount);

    let nextStatus = invoice.status;

    if (!["DRAFT", "CANCELLED"].includes(invoice.status)) {
        if (safeBalance <= 0) {
            nextStatus = "PAID";
        } else if (safeBalance < total) {
            nextStatus = "PARTIAL";
        } else if (invoice.status === "PAID" || invoice.status === "PARTIAL") {
            nextStatus = "SENT";
        }
    }

    await connection.execute(
        `UPDATE invoices
         SET balance_amount = ?,
             status = ?
         WHERE id = ? AND company_id = ?`,
        [safeBalance, nextStatus, invoice.id, invoice.company_id]
    );

    return { balance_amount: safeBalance, status: nextStatus };
};

module.exports = {
    createInvoice,
    getInvoices,
    getInvoiceById,
    findByNumber,
    updateStatus,
    applyPaymentToBalance
};
