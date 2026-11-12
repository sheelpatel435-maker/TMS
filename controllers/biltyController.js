const biltyModel = require("../models/biltyModel");
const { parsePagination } = require("../utils/pagination");
const { sendError, HttpError } = require("../utils/httpError");
const { isMissing } = require("../utils/validation");
const { assertOwned, resolveCompanyId } = require("../utils/companyScope");
const { parseListFilters } = require("../utils/queryFilters");
const { writeAudit } = require("../utils/audit");
const {
    assertTransition,
    isAllowedStatus,
    normalizeStatus
} = require("../utils/statusTransitions");

const getBilties = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const { rows: bilties, pagination } = await biltyModel.getBilties(
            companyId,
            parsePagination(req.query),
            parseListFilters(req.query)
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

const getBiltyById = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const bilty = await biltyModel.getBiltyById(req.params.id, companyId);

        if (!bilty) {
            throw new HttpError(404, "Bilty not found");
        }

        return res.status(200).json({
            success: true,
            bilty
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const reserveBilty = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const { bilty_number } = req.body;

        if (isMissing(bilty_number)) {
            throw new HttpError(400, "Bilty number is required");
        }

        const existing = await biltyModel.findByNumber(companyId, bilty_number);

        if (existing) {
            throw new HttpError(409, "Bilty number already exists");
        }

        const id = await biltyModel.createBilty(companyId, {
            bilty_number,
            status: "RESERVED"
        });

        await writeAudit(req, "BILTY_RESERVED", "bilty", id);

        return res.status(201).json({
            success: true,
            message: "Bilty number reserved successfully",
            id
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const createBilty = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const { bilty_number, client_id, trip_id, status } = req.body;

        if (isMissing(bilty_number)) {
            throw new HttpError(400, "Bilty number is required");
        }

        const biltyStatus = normalizeStatus("bilty", status || "DRAFT");

        if (!isAllowedStatus("bilty", biltyStatus)) {
            throw new HttpError(400, "Invalid bilty status");
        }

        if (!["DRAFT", "CREATED", "CONFIRMED", "RESERVED"].includes(biltyStatus)) {
            throw new HttpError(400, "New bilty must start as RESERVED or DRAFT");
        }

        const existing = await biltyModel.findByNumber(companyId, bilty_number);

        if (existing) {
            throw new HttpError(409, "Bilty number already exists");
        }

        await assertOwned("clients", client_id, companyId, "Client");
        await assertOwned("trips", trip_id, companyId, "Trip");

        const id = await biltyModel.createBilty(companyId, {
            ...req.body,
            status: biltyStatus
        });
        await writeAudit(req, "BILTY_CREATED", "bilty", id);

        return res.status(201).json({
            success: true,
            message: "Bilty created successfully",
            id
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const updateBilty = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const { client_id, trip_id, status } = req.body;

        const existing = await biltyModel.getBiltyById(req.params.id, companyId);

        if (!existing) {
            throw new HttpError(404, "Bilty not found");
        }

        let nextStatus = existing.status;

        if (status) {
            nextStatus = normalizeStatus("bilty", status);

            if (!isAllowedStatus("bilty", nextStatus)) {
                throw new HttpError(400, "Invalid bilty status");
            }

            assertTransition("bilty", existing.status, nextStatus);
        }

        await assertOwned("clients", client_id, companyId, "Client");
        await assertOwned("trips", trip_id, companyId, "Trip");

        const updated = await biltyModel.updateBilty(req.params.id, companyId, {
            ...req.body,
            status: nextStatus
        });

        if (!updated) {
            throw new HttpError(404, "Bilty not found");
        }

        await writeAudit(
            req,
            "BILTY_UPDATED",
            "bilty",
            req.params.id,
            status ? `${existing.status} -> ${nextStatus}` : null
        );

        return res.status(200).json({
            success: true,
            message: "Bilty updated successfully"
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const deactivateBilty = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const bilty = await biltyModel.getBiltyById(req.params.id, companyId);

        if (!bilty) {
            throw new HttpError(404, "Bilty not found");
        }

        if (["USED", "COMPLETED"].includes(bilty.status)) {
            throw new HttpError(400, "Used/completed bilty cannot be cancelled");
        }

        if (bilty.status === "CANCELLED") {
            return res.status(200).json({
                success: true,
                message: "Bilty already cancelled"
            });
        }

        assertTransition("bilty", bilty.status, "CANCELLED");

        const updated = await biltyModel.deactivateBilty(req.params.id, companyId);

        if (!updated) {
            throw new HttpError(400, "Bilty could not be cancelled");
        }

        await writeAudit(req, "BILTY_CANCELLED", "bilty", req.params.id);

        return res.status(200).json({
            success: true,
            message: "Bilty cancelled successfully"
        });
    } catch (error) {
        return sendError(res, error);
    }
};

module.exports = {
    getBilties,
    getBiltyById,
    reserveBilty,
    createBilty,
    updateBilty,
    deactivateBilty
};
