const invoiceModel = require("../models/invoiceModel");
const { parsePagination } = require("../utils/pagination");
const { sendError, HttpError } = require("../utils/httpError");
const { isMissing, isValidAmount, roundMoney, toNumber } = require("../utils/validation");
const { assertOwned, resolveCompanyId } = require("../utils/companyScope");
const { assertTransition, isAllowedStatus } = require("../utils/statusTransitions");
const { parseListFilters } = require("../utils/queryFilters");
const { writeAudit } = require("../utils/audit");

const buildLineItem = async (item, companyId) => {
    await assertOwned("trips", item.trip_id, companyId, "Trip");
    await assertOwned("bilties", item.bilty_id, companyId, "Bilty");

    const freight = isValidAmount(item.freight ?? item.freight_amount)
        ? toNumber(item.freight ?? item.freight_amount)
        : 0;
    const detention = isValidAmount(item.detention ?? item.detention_charges)
        ? toNumber(item.detention ?? item.detention_charges)
        : 0;
    const hamali = isValidAmount(item.hamali ?? item.hamali_charges)
        ? toNumber(item.hamali ?? item.hamali_charges)
        : 0;
    const otherCharges = isValidAmount(item.other_charges)
        ? toNumber(item.other_charges)
        : 0;

    return {
        trip_id: item.trip_id || null,
        bilty_id: item.bilty_id || null,
        description: item.description || null,
        freight: roundMoney(freight),
        detention: roundMoney(detention),
        hamali: roundMoney(hamali),
        other_charges: roundMoney(otherCharges),
        item_total: roundMoney(freight + detention + hamali + otherCharges)
    };
};

const createInvoice = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const {
            client_id,
            invoice_number,
            invoice_date,
            due_date,
            tax_amount,
            deduction_amount,
            items
        } = req.body;

        if (isMissing(client_id) || isMissing(invoice_number) || isMissing(invoice_date)) {
            throw new HttpError(400, "client_id, invoice_number and invoice_date are required");
        }

        await assertOwned("clients", client_id, companyId, "Client");

        const existing = await invoiceModel.findByNumber(
            companyId,
            invoice_number
        );

        if (existing) {
            throw new HttpError(409, "Invoice number already exists");
        }

        const lineItems = [];

        if (Array.isArray(items)) {
            for (const item of items) {
                lineItems.push(await buildLineItem(item, companyId));
            }
        }

        const subtotal = roundMoney(
            lineItems.reduce((sum, item) => sum + Number(item.item_total), 0)
        );
        const taxAmount = isValidAmount(tax_amount) ? roundMoney(tax_amount) : 0;
        const deductionAmount = isValidAmount(deduction_amount)
            ? roundMoney(deduction_amount)
            : 0;
        const totalAmount = roundMoney(subtotal + taxAmount);
        const balanceAmount = roundMoney(totalAmount - deductionAmount);

        const invoiceId = await invoiceModel.createInvoice({
            company_id: companyId,
            client_id,
            invoice_number,
            invoice_date,
            due_date,
            taxable_amount: subtotal,
            subtotal,
            tax_amount: taxAmount,
            total_amount: totalAmount,
            deduction_amount: deductionAmount,
            balance_amount: balanceAmount < 0 ? 0 : balanceAmount,
            items: lineItems
        });

        await writeAudit(req, "INVOICE_CREATED", "invoice", invoiceId);

        return res.status(201).json({
            success: true,
            message: "Invoice created successfully",
            invoice_id: invoiceId
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const getInvoices = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const { rows: invoices, pagination } = await invoiceModel.getInvoices(
            companyId,
            parsePagination(req.query),
            parseListFilters(req.query)
        );

        return res.status(200).json({
            success: true,
            invoices,
            pagination
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const getInvoiceById = async (req, res) => {
    try {
        const invoice = await invoiceModel.getInvoiceById(
            req.params.id,
            resolveCompanyId(req)
        );

        if (!invoice) {
            throw new HttpError(404, "Invoice not found");
        }

        return res.status(200).json({
            success: true,
            invoice
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const updateInvoice = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const invoice = await invoiceModel.getInvoiceById(req.params.id, companyId);

        if (!invoice) {
            throw new HttpError(404, "Invoice not found");
        }

        if (invoice.status !== "DRAFT") {
            throw new HttpError(400, "Only DRAFT invoices can be edited");
        }

        const {
            client_id,
            invoice_date,
            due_date,
            tax_amount,
            deduction_amount,
            items
        } = req.body;

        if (isMissing(client_id) || isMissing(invoice_date)) {
            throw new HttpError(400, "client_id and invoice_date are required");
        }

        await assertOwned("clients", client_id, companyId, "Client");

        const lineItems = [];

        if (Array.isArray(items)) {
            for (const item of items) {
                lineItems.push(await buildLineItem(item, companyId));
            }
        }

        const subtotal = roundMoney(
            lineItems.reduce((sum, item) => sum + Number(item.item_total), 0)
        );
        const taxAmount = isValidAmount(tax_amount) ? roundMoney(tax_amount) : 0;
        const deductionAmount = isValidAmount(deduction_amount)
            ? roundMoney(deduction_amount)
            : 0;
        const totalAmount = roundMoney(subtotal + taxAmount);
        const balanceAmount = roundMoney(totalAmount - deductionAmount);

        const updated = await invoiceModel.updateInvoice(req.params.id, companyId, {
            client_id,
            invoice_date,
            due_date,
            taxable_amount: subtotal,
            subtotal,
            tax_amount: taxAmount,
            total_amount: totalAmount,
            deduction_amount: deductionAmount,
            balance_amount: balanceAmount < 0 ? 0 : balanceAmount,
            items: lineItems
        });

        if (!updated) {
            throw new HttpError(400, "Invoice could not be updated");
        }

        await writeAudit(req, "INVOICE_UPDATED", "invoice", req.params.id);

        return res.status(200).json({
            success: true,
            message: "Invoice updated successfully"
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const deactivateInvoice = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const invoice = await invoiceModel.getInvoiceById(req.params.id, companyId);

        if (!invoice) {
            throw new HttpError(404, "Invoice not found");
        }

        if (invoice.status === "CANCELLED") {
            return res.status(200).json({
                success: true,
                message: "Invoice already cancelled"
            });
        }

        assertTransition("invoice", invoice.status, "CANCELLED");
        await invoiceModel.updateStatus(req.params.id, companyId, "CANCELLED");
        await writeAudit(
            req,
            "INVOICE_CANCELLED",
            "invoice",
            req.params.id,
            `${invoice.status} -> CANCELLED`
        );

        return res.status(200).json({
            success: true,
            message: "Invoice cancelled successfully"
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const updateStatus = async (req, res) => {
    try {
        const { status } = req.body;

        if (!isAllowedStatus("invoice", status)) {
            throw new HttpError(400, "Invalid invoice status");
        }

        const companyId = resolveCompanyId(req);
        const invoice = await invoiceModel.getInvoiceById(
            req.params.id,
            companyId
        );

        if (!invoice) {
            throw new HttpError(404, "Invoice not found");
        }

        assertTransition("invoice", invoice.status, status);

        await invoiceModel.updateStatus(
            req.params.id,
            companyId,
            status
        );

        await writeAudit(
            req,
            status === "CANCELLED" ? "INVOICE_CANCELLED" : "INVOICE_STATUS_UPDATED",
            "invoice",
            req.params.id,
            `${invoice.status} -> ${status}`
        );

        return res.status(200).json({
            success: true,
            message: "Invoice status updated successfully"
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const escapeHtml = (value) =>
    String(value ?? "-")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

const printInvoice = async (req, res) => {
    try {
        const invoice = await invoiceModel.getInvoiceById(
            req.params.id,
            resolveCompanyId(req)
        );

        if (!invoice) {
            throw new HttpError(404, "Invoice not found");
        }

        const itemRows = (invoice.items || [])
            .map(
                (item) =>
                    `<tr>
                        <td>${escapeHtml(item.description || "-")}</td>
                        <td>${escapeHtml(item.freight)}</td>
                        <td>${escapeHtml(item.detention)}</td>
                        <td>${escapeHtml(item.hamali)}</td>
                        <td>${escapeHtml(item.other_charges)}</td>
                        <td>${escapeHtml(item.item_total)}</td>
                    </tr>`
            )
            .join("");

        const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Invoice ${invoice.invoice_number}</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 24px; color: #222; }
        h1 { margin-bottom: 4px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
        .totals { margin-top: 16px; }
    </style>
</head>
<body>
    <h1>Invoice ${escapeHtml(invoice.invoice_number)}</h1>
    <p>Date: ${escapeHtml(invoice.invoice_date || "-")} | Due: ${escapeHtml(invoice.due_date || "-")} | Status: ${escapeHtml(invoice.status)}</p>
    <table>
        <thead>
            <tr>
                <th>Description</th>
                <th>Freight</th>
                <th>Detention</th>
                <th>Hamali</th>
                <th>Other</th>
                <th>Total</th>
            </tr>
        </thead>
        <tbody>${itemRows}</tbody>
    </table>
    <div class="totals">
        <p>Subtotal: ${escapeHtml(invoice.subtotal)}</p>
        <p>Tax: ${escapeHtml(invoice.tax_amount)}</p>
        <p>Total: ${escapeHtml(invoice.total_amount)}</p>
        <p>Balance: ${escapeHtml(invoice.balance_amount)}</p>
    </div>
    <script>window.onload = function () { window.print(); };</script>
</body>
</html>`;

        res.setHeader("Content-Type", "text/html; charset=utf-8");
        return res.status(200).send(html);
    } catch (error) {
        return sendError(res, error);
    }
};

module.exports = {
    createInvoice,
    getInvoices,
    getInvoiceById,
    updateInvoice,
    deactivateInvoice,
    updateStatus,
    printInvoice
};
