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
                due_date,
                service_description,
                hsn_sac,
                payment_terms,
                taxable_amount,
                subtotal,
                tax_amount,
                total_amount,
                deduction_amount,
                balance_amount,
                status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT')`,
            [
                data.company_id,
                data.client_id,
                data.invoice_number,
                data.invoice_date,
                data.due_date || null,
                data.service_description || "Transportation of Goods by Road",
                data.hsn_sac || "996791",
                data.payment_terms || null,
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
                await insertItem(connection, data.company_id, invoiceId, item);
            }
        }

        await replaceTaxes(connection, data.company_id, invoiceId, data.taxes);

        await connection.commit();

        return invoiceId;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const getInvoices = async (companyId, pagination, filters = {}) => {
    const { where, params } = require("../utils/queryFilters").buildListWhere({
        companyId,
        filters,
        searchColumns: ["invoice_number"],
        dateColumn: "invoice_date"
    });

    if (filters.overdue) {
        const overdueSql =
            "due_date IS NOT NULL AND due_date < CURDATE() AND status IN ('SENT','PARTIAL')";
        return paginatedSelect(db, {
            table: "invoices",
            columns: "*",
            where: where ? `${where} AND ${overdueSql}` : overdueSql,
            params,
            pagination
        });
    }

    return paginatedSelect(db, {
        table: "invoices",
        columns: "*",
        where,
        params,
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

    const [taxes] = await db.execute(
        `SELECT *
         FROM invoice_taxes
         WHERE invoice_id = ? AND company_id = ?
         ORDER BY id ASC`,
        [id, companyId]
    );

    return {
        ...invoiceRows[0],
        items,
        taxes
    };
};

const insertItem = async (connection, companyId, invoiceId, item) => {
    await connection.execute(
        `INSERT INTO invoice_items
        (
            company_id,
            invoice_id,
            trip_id,
            bilty_id,
            description,
            hsn_sac,
            freight,
            detention,
            hamali,
            other_charges,
            item_total,
            consignor_name,
            consignor_invoice_no,
            consignor_invoice_date,
            from_location,
            destination,
            vehicle_type,
            vehicle_number,
            gr_lr_number,
            reporting_date,
            delivery_date,
            quantity,
            quantity_unit
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            companyId,
            invoiceId,
            item.trip_id || null,
            item.bilty_id || null,
            item.description || "Transportation of Goods by Road",
            item.hsn_sac || "996791",
            item.freight || 0,
            item.detention || 0,
            item.hamali || 0,
            item.other_charges || 0,
            item.item_total || 0,
            item.consignor_name || null,
            item.consignor_invoice_no || null,
            item.consignor_invoice_date || null,
            item.from_location || null,
            item.destination || null,
            item.vehicle_type || null,
            item.vehicle_number || null,
            item.gr_lr_number || null,
            item.reporting_date || null,
            item.delivery_date || null,
            item.quantity ?? null,
            item.quantity_unit || null
        ]
    );
};

const findOpenInvoiceForTrip = async (companyId, tripId, excludeInvoiceId = null) => {
    if (!tripId) return null;
    const params = [companyId, tripId];
    let sql = `SELECT i.id, i.invoice_number, i.status
               FROM invoice_items ii
               INNER JOIN invoices i
                 ON i.id = ii.invoice_id AND i.company_id = ii.company_id
               WHERE ii.company_id = ?
                 AND ii.trip_id = ?
                 AND i.status <> 'CANCELLED'`;
    if (excludeInvoiceId) {
        sql += " AND i.id <> ?";
        params.push(excludeInvoiceId);
    }
    sql += " LIMIT 1";
    const [rows] = await db.execute(sql, params);
    return rows[0] || null;
};

const addDeliveryLog = async ({
    companyId,
    invoiceId,
    actionType,
    recipient = null,
    details = null,
    createdBy = null
}) => {
    const [result] = await db.execute(
        `INSERT INTO invoice_delivery_logs
         (company_id, invoice_id, action_type, recipient, details, created_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [companyId, invoiceId, actionType, recipient, details, createdBy]
    );
    return result.insertId;
};

const getDeliveryLogs = async (companyId, invoiceId) => {
    const [rows] = await db.execute(
        `SELECT *
         FROM invoice_delivery_logs
         WHERE company_id = ? AND invoice_id = ?
         ORDER BY id DESC`,
        [companyId, invoiceId]
    );
    return rows;
};

const markApproved = async (id, companyId, userId) => {
    const [result] = await db.execute(
        `UPDATE invoices
         SET status = 'APPROVED',
             approved_at = NOW(),
             approved_by = ?
         WHERE id = ? AND company_id = ?`,
        [userId || null, id, companyId]
    );
    return result.affectedRows;
};

const markPdfGenerated = async (id, companyId) => {
    const [result] = await db.execute(
        `UPDATE invoices
         SET pdf_generated_at = NOW()
         WHERE id = ? AND company_id = ?`,
        [id, companyId]
    );
    return result.affectedRows;
};

const markEmailSent = async (id, companyId) => {
    const [result] = await db.execute(
        `UPDATE invoices
         SET email_sent_at = NOW(),
             status = CASE
               WHEN status IN ('DRAFT', 'APPROVED') THEN 'SENT'
               ELSE status
             END
         WHERE id = ? AND company_id = ?`,
        [id, companyId]
    );
    return result.affectedRows;
};

const replaceTaxes = async (connection, companyId, invoiceId, taxes) => {
    await connection.execute(
        `DELETE FROM invoice_taxes
         WHERE invoice_id = ? AND company_id = ?`,
        [invoiceId, companyId]
    );

    if (!Array.isArray(taxes)) {
        return;
    }

    for (const tax of taxes) {
        await connection.execute(
            `INSERT INTO invoice_taxes
            (company_id, invoice_id, tax_type, tax_rate, taxable_amount, tax_amount)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [
                companyId,
                invoiceId,
                tax.tax_type,
                tax.tax_rate,
                tax.taxable_amount,
                tax.tax_amount
            ]
        );
    }
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

const updateInvoice = async (id, companyId, data) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const [result] = await connection.execute(
            `UPDATE invoices
             SET client_id = ?,
                 invoice_date = ?,
                 due_date = ?,
                 service_description = ?,
                 hsn_sac = ?,
                 payment_terms = ?,
                 taxable_amount = ?,
                 subtotal = ?,
                 tax_amount = ?,
                 total_amount = ?,
                 deduction_amount = ?,
                 balance_amount = ?
             WHERE id = ? AND company_id = ? AND status = 'DRAFT'`,
            [
                data.client_id,
                data.invoice_date,
                data.due_date || null,
                data.service_description || "Transportation of Goods by Road",
                data.hsn_sac || "996791",
                data.payment_terms || null,
                data.taxable_amount,
                data.subtotal,
                data.tax_amount,
                data.total_amount,
                data.deduction_amount,
                data.balance_amount,
                id,
                companyId
            ]
        );

        if (!result.affectedRows) {
            await connection.rollback();
            return 0;
        }

        await connection.execute(
            `DELETE FROM invoice_items
             WHERE invoice_id = ? AND company_id = ?`,
            [id, companyId]
        );

        if (Array.isArray(data.items)) {
            for (const item of data.items) {
                await insertItem(connection, companyId, id, item);
            }
        }

        await replaceTaxes(connection, companyId, id, data.taxes);

        await connection.commit();
        return 1;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
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
    findOpenInvoiceForTrip,
    updateInvoice,
    updateStatus,
    applyPaymentToBalance,
    addDeliveryLog,
    getDeliveryLogs,
    markApproved,
    markPdfGenerated,
    markEmailSent
};
