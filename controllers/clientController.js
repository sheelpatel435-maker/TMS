const clientModel = require("../models/clientModel");
const { parsePagination } = require("../utils/pagination");
const { sendError, HttpError } = require("../utils/httpError");
const { firstPresent, isMissing } = require("../utils/validation");
const { resolveCompanyId } = require("../utils/companyScope");
const { parseListFilters } = require("../utils/queryFilters");
const { writeAudit } = require("../utils/audit");

const getClients = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const { rows: clients, pagination } = await clientModel.getClients(
            companyId,
            parsePagination(req.query),
            parseListFilters(req.query)
        );

        return res.status(200).json({
            success: true,
            clients,
            pagination
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const getClientById = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const client = await clientModel.getClientById(req.params.id, companyId);

        if (!client) {
            throw new HttpError(404, "Client not found");
        }

        return res.status(200).json({
            success: true,
            client
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const createClient = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const name = firstPresent(req.body.name, req.body.client_name);

        if (isMissing(name)) {
            throw new HttpError(400, "Client name is required");
        }

        const mobile = req.body.mobile || null;
        const gstNumber = req.body.gst_number || null;

        if (mobile) {
            const byMobile = await clientModel.findClientByMobile(companyId, mobile);
            if (byMobile) {
                throw new HttpError(409, "Client with this mobile number already exists");
            }
        }

        if (gstNumber) {
            const byGst = await clientModel.findClientByGst(companyId, gstNumber);
            if (byGst) {
                throw new HttpError(409, "Client with this GST number already exists");
            }
        }

        const id = await clientModel.createClient(companyId, {
            ...req.body,
            name
        });
        await writeAudit(req, "CLIENT_CREATED", "client", id);

        return res.status(201).json({
            success: true,
            message: "Client created successfully",
            id
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const updateClient = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const existing = await clientModel.getClientById(req.params.id, companyId);

        if (!existing) {
            throw new HttpError(404, "Client not found");
        }

        const name = firstPresent(req.body.name, req.body.client_name, existing.name);

        if (isMissing(name)) {
            throw new HttpError(400, "Client name is required");
        }

        const mobile =
            req.body.mobile !== undefined ? req.body.mobile || null : existing.mobile;
        const gstNumber =
            req.body.gst_number !== undefined
                ? req.body.gst_number || null
                : existing.gst_number;

        if (mobile) {
            const byMobile = await clientModel.findClientByMobile(
                companyId,
                mobile,
                req.params.id
            );
            if (byMobile) {
                throw new HttpError(409, "Client with this mobile number already exists");
            }
        }

        if (gstNumber) {
            const byGst = await clientModel.findClientByGst(
                companyId,
                gstNumber,
                req.params.id
            );
            if (byGst) {
                throw new HttpError(409, "Client with this GST number already exists");
            }
        }

        const updated = await clientModel.updateClient(req.params.id, companyId, {
            name,
            mobile,
            email: req.body.email !== undefined ? req.body.email : existing.email,
            billing_email:
                req.body.billing_email !== undefined
                    ? req.body.billing_email
                    : existing.billing_email,
            address:
                req.body.address !== undefined ? req.body.address : existing.address,
            gst_number: gstNumber,
            state_code:
                req.body.state_code !== undefined
                    ? req.body.state_code
                    : existing.state_code,
            payment_terms:
                req.body.payment_terms !== undefined
                    ? req.body.payment_terms
                    : existing.payment_terms,
            status: req.body.status !== undefined ? req.body.status : existing.status
        });

        if (!updated) {
            throw new HttpError(404, "Client not found");
        }

        await writeAudit(req, "CLIENT_UPDATED", "client", req.params.id);

        return res.status(200).json({
            success: true,
            message: "Client updated successfully"
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const deactivateClient = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const updated = await clientModel.deactivateClient(req.params.id, companyId);

        if (!updated) {
            throw new HttpError(404, "Client not found");
        }

        await writeAudit(req, "CLIENT_DEACTIVATED", "client", req.params.id);

        return res.status(200).json({
            success: true,
            message: "Client deactivated successfully"
        });
    } catch (error) {
        return sendError(res, error);
    }
};

module.exports = {
    getClients,
    getClientById,
    createClient,
    updateClient,
    deactivateClient
};
