const db = require("../config/db");

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
                hsn_sac_code,
                exemption_notification,
                subtotal,
                tax_amount,
                total_amount,
                balance_amount,
                tds_amount,
                other_deduction_amount,
                net_receivable_amount,
                status,
                created_by
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?)`,
            [
                data.company_id,
                data.client_id,
                data.invoice_number,
                data.invoice_date,
                data.due_date,
                data.service_description,
                data.hsn_sac_code,
                data.exemption_notification,
                data.subtotal,
                data.tax_amount,
                data.total_amount,
                data.balance_amount,
                data.tds_amount,
                data.other_deduction_amount,
                data.net_receivable_amount,
                data.created_by
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
                        serial_no,
                        consignor_tax_invoice_no,
                        consignor_invoice_date,
                        consignor_name,
                        from_location,
                        destination,
                        vehicle_id,
                        vehicle_type,
                        gr_lr_no,
                        freight_amount,
                        detention_charges,
                        hamali_charges,
                        other_charges,
                        line_total,
                        reporting_date,
                        delivery_date,
                        total_qty_load,
                        charge_weight,
                        rate,
                        rate_unit,
                        billing_status,
                        description
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        data.company_id,
                        invoiceId,
                        item.trip_id || null,
                        item.bilty_id || null,
                        item.serial_no,
                        item.consignor_tax_invoice_no || null,
                        item.consignor_invoice_date || null,
                        item.consignor_name || null,
                        item.from_location || null,
                        item.destination || null,
                        item.vehicle_id || null,
                        item.vehicle_type || null,
                        item.gr_lr_no || null,
                        item.freight_amount || 0,
                        item.detention_charges || 0,
                        item.hamali_charges || 0,
                        item.other_charges || 0,
                        item.line_total || 0,
                        item.reporting_date || null,
                        item.delivery_date || null,
                        item.total_qty_load || null,
                        item.charge_weight || null,
                        item.rate || null,
                        item.rate_unit || null,
                        item.billing_status || "BILLABLE",
                        item.description || null
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

const getInvoices = async (companyId) => {
    const [rows] = await db.execute(
        `SELECT *
         FROM invoices
         WHERE company_id = ?
         ORDER BY id DESC`,
        [companyId]
    );

    return rows;
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
         ORDER BY serial_no ASC`,
        [id, companyId]
    );

    return {
        ...invoiceRows[0],
        items
    };
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

module.exports = {
    createInvoice,
    getInvoices,
    getInvoiceById,
    updateStatus
};
