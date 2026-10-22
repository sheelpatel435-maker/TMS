const clientModel = require("../models/clientModel");
const { parsePagination } = require("../utils/pagination");
const { sendError, HttpError } = require("../utils/httpError");
const { firstPresent, isMissing } = require("../utils/validation");

const getClients = async (req, res) => {
    try {
        const { rows: clients, pagination } = await clientModel.getClients(
            req.user.company_id,
            parsePagination(req.query)
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

const createClient = async (req, res) => {
    try {
        const name = firstPresent(req.body.name, req.body.client_name);

        if (isMissing(name)) {
            throw new HttpError(400, "Client name is required");
        }

        const id = await clientModel.createClient(
            req.user.company_id,
            {
                ...req.body,
                name
            }
        );

        return res.status(201).json({
            success: true,
            message: "Client created successfully",
            id
        });
    } catch (error) {
        return sendError(res, error);
    }
};

module.exports = {
    getClients,
    createClient
};
