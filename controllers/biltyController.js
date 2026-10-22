const biltyModel = require("../models/biltyModel");
const { parsePagination } = require("../utils/pagination");
const { sendError, HttpError } = require("../utils/httpError");
const { isMissing } = require("../utils/validation");
const { assertOwned } = require("../utils/companyScope");

const ALLOWED_STATUSES = ["RESERVED", "CREATED", "CANCELLED", "COMPLETED"];

const getBilties = async (req, res) => {
    try {
        const { rows: bilties, pagination } = await biltyModel.getBilties(
            req.user.company_id,
            parsePagination(req.query)
        );

        return res.status(200).json({
            success: true,
            bilties,
            pagination
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const createBilty = async (req, res) => {
    try {
        const { bilty_number, client_id, trip_id, status } = req.body;

        if (isMissing(bilty_number)) {
            throw new HttpError(400, "Bilty number is required");
        }

        const biltyStatus = status || "CREATED";

        if (!ALLOWED_STATUSES.includes(biltyStatus)) {
            throw new HttpError(400, "Invalid bilty status");
        }

        const existing = await biltyModel.findByNumber(
            req.user.company_id,
            bilty_number
        );

        if (existing) {
            throw new HttpError(409, "Bilty number already exists");
        }

        await assertOwned("clients", client_id, req.user.company_id, "Client");
        await assertOwned("trips", trip_id, req.user.company_id, "Trip");

        const id = await biltyModel.createBilty(
            req.user.company_id,
            {
                ...req.body,
                status: biltyStatus
            }
        );

        return res.status(201).json({
            success: true,
            message: "Bilty created successfully",
            id
        });
    } catch (error) {
        return sendError(res, error);
    }
};

module.exports = {
    getBilties,
    createBilty
};
