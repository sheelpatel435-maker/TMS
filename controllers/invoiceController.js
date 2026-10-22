const invoiceModel = require("../models/invoiceModel");
const { parsePagination } = require("../utils/pagination");
const { sendError, HttpError } = require("../utils/httpError");
const { isMissing, isValidAmount, roundMoney, toNumber } = require("../utils/validation");
const { assertOwned } = require("../utils/companyScope");
const { assertTransition, isAllowedStatus } = require("../utils/statusTransitions");

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
        const {
            client_id,
            invoice_number,
            invoice_date,
            tax_amount,
            deduction_amount,
            items
        } = req.body;

        if (isMissing(client_id) || isMissing(invoice_number) || isMissing(invoice_date)) {
            throw new HttpError(400, "client_id, invoice_number and invoice_date are required");
        }

        await assertOwned("clients", client_id, req.user.company_id, "Client");

        const existing = await invoiceModel.findByNumber(
            req.user.company_id,
            invoice_number
        );

        if (existing) {
            throw new HttpError(409, "Invoice number already exists");
        }

        const lineItems = [];

        if (Array.isArray(items)) {
            for (const item of items) {
                lineItems.push(await buildLineItem(item, req.user.company_id));
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
            company_id: req.user.company_id,
            client_id,
            invoice_number,
            invoice_date,
            taxable_amount: subtotal,
            subtotal,
            tax_amount: taxAmount,
            total_amount: totalAmount,
            deduction_amount: deductionAmount,
            balance_amount: balanceAmount < 0 ? 0 : balanceAmount,
            items: lineItems
        });

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
        const { rows: invoices, pagination } = await invoiceModel.getInvoices(
            req.user.company_id,
            parsePagination(req.query)
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
            req.user.company_id
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

const updateStatus = async (req, res) => {
    try {
        const { status } = req.body;

        if (!isAllowedStatus("invoice", status)) {
            throw new HttpError(400, "Invalid invoice status");
        }

        const invoice = await invoiceModel.getInvoiceById(
            req.params.id,
            req.user.company_id
        );

        if (!invoice) {
            throw new HttpError(404, "Invoice not found");
        }

        assertTransition("invoice", invoice.status, status);

        await invoiceModel.updateStatus(
            req.params.id,
            req.user.company_id,
            status
        );

        return res.status(200).json({
            success: true,
            message: "Invoice status updated successfully"
        });
    } catch (error) {
        return sendError(res, error);
    }
};

module.exports = {
    createInvoice,
    getInvoices,
    getInvoiceById,
    updateStatus
};
