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
        const name = firstPresent(req.body.name, req.body.client_name);

        if (isMissing(name)) {
            throw new HttpError(400, "Client name is required");
        }

        const updated = await clientModel.updateClient(req.params.id, companyId, {
            ...req.body,
            name
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
