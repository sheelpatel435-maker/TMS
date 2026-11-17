const biltyModel = require("../models/biltyModel");
const companyModel = require("../models/companyModel");
const { parsePagination } = require("../utils/pagination");
const { sendError, HttpError } = require("../utils/httpError");
const { isMissing } = require("../utils/validation");
const { assertOwned, resolveCompanyId } = require("../utils/companyScope");
const { parseListFilters } = require("../utils/queryFilters");
const { writeAudit } = require("../utils/audit");
const { withTransaction } = require("../utils/transaction");
const {
    assertTransition,
    isAllowedStatus,
    normalizeStatus
} = require("../utils/statusTransitions");
const {
    normalizeBiltyPayload,
    buildPrintPayload
} = require("../utils/biltyFields");
const { positiveInteger } = require("../utils/vehicleValidation");

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
        const bilty = await biltyModel.getBiltyWithCharges(req.params.id, companyId);

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

const getBiltyPrint = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const bilty = await biltyModel.getBiltyWithCharges(req.params.id, companyId);
        if (!bilty) {
            throw new HttpError(404, "Bilty not found");
        }

        const company = await companyModel.getById(companyId);
        return res.status(200).json({
            success: true,
            print: buildPrintPayload(bilty, company)
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

const expandRange = (from, to) => {
    const startRaw = String(from).trim();
    const endRaw = String(to).trim();
    const startMatch = startRaw.match(/^(.*?)(\d+)$/);
    const endMatch = endRaw.match(/^(.*?)(\d+)$/);

    if (!startMatch || !endMatch || startMatch[1] !== endMatch[1]) {
        throw new HttpError(400, "from and to must share the same prefix and end with digits");
    }

    const prefix = startMatch[1];
    const startNum = Number(startMatch[2]);
    const endNum = Number(endMatch[2]);
    const width = Math.max(startMatch[2].length, endMatch[2].length);

    if (!Number.isSafeInteger(startNum) || !Number.isSafeInteger(endNum) || endNum < startNum) {
        throw new HttpError(400, "Invalid bilty number range");
    }

    if (endNum - startNum + 1 > 200) {
        throw new HttpError(400, "Reserve at most 200 bilty numbers at once");
    }

    const numbers = [];
    for (let value = startNum; value <= endNum; value += 1) {
        numbers.push(`${prefix}${String(value).padStart(width, "0")}`);
    }
    return numbers;
};

const reserveBiltyRange = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const { from, to, bilty_numbers } = req.body || {};
        let numbers = [];

        if (Array.isArray(bilty_numbers) && bilty_numbers.length) {
            numbers = [...new Set(bilty_numbers.map((value) => String(value).trim()).filter(Boolean))];
        } else if (!isMissing(from) && !isMissing(to)) {
            numbers = expandRange(from, to);
        } else {
            throw new HttpError(400, "Provide from/to or bilty_numbers[]");
        }

        if (numbers.length > 200) {
            throw new HttpError(400, "Reserve at most 200 bilty numbers at once");
        }

        const reserved = [];
        const skipped = [];

        for (const bilty_number of numbers) {
            const existing = await biltyModel.findByNumber(companyId, bilty_number);
            if (existing) {
                skipped.push(bilty_number);
                continue;
            }

            const id = await biltyModel.createBilty(companyId, {
                bilty_number,
                status: "RESERVED"
            });
            reserved.push({ id, bilty_number });
            await writeAudit(req, "BILTY_RESERVED", "bilty", id);
        }

        return res.status(201).json({
            success: true,
            message: `Reserved ${reserved.length} bilty number(s)`,
            reserved,
            skipped
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const assertBiltyRelations = async (companyId, data) => {
    await assertOwned("clients", data.client_id, companyId, "Client");
    await assertOwned("trips", data.trip_id, companyId, "Trip");
    await assertOwned("vehicles", data.vehicle_id, companyId, "Vehicle");
};

const createBilty = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const { bilty_number, status } = req.body;

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

        const data = normalizeBiltyPayload({ ...req.body, bilty_number });
        data.bilty_number = String(bilty_number).trim();
        data.status = biltyStatus;

        if (data.client_id) {
            data.client_id = positiveInteger(data.client_id, "client_id");
        }
        if (data.trip_id) {
            data.trip_id = positiveInteger(data.trip_id, "trip_id");
        }
        if (data.vehicle_id) {
            data.vehicle_id = positiveInteger(data.vehicle_id, "vehicle_id");
        }

        await assertBiltyRelations(companyId, data);

        const id = await withTransaction(async (connection) => {
            const createdId = await biltyModel.createBilty(companyId, data, connection);
            if (data.charges) {
                await biltyModel.replaceBiltyCharges(
                    companyId,
                    createdId,
                    data.charges,
                    connection
                );
            }
            await writeAudit(req, "BILTY_CREATED", "bilty", createdId, undefined, {
                companyId,
                connection,
                required: true
            });
            return createdId;
        });

        const bilty = await biltyModel.getBiltyWithCharges(id, companyId);

        return res.status(201).json({
            success: true,
            message: "Bilty created successfully",
            id,
            bilty
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const updateBilty = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const { status } = req.body;

        const existing = await biltyModel.getBiltyWithCharges(req.params.id, companyId);

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

        const data = normalizeBiltyPayload(req.body, existing);
        data.bilty_number = existing.bilty_number;
        data.status = nextStatus;

        if (data.client_id) {
            data.client_id = positiveInteger(data.client_id, "client_id");
        }
        if (data.trip_id) {
            data.trip_id = positiveInteger(data.trip_id, "trip_id");
        }
        if (data.vehicle_id) {
            data.vehicle_id = positiveInteger(data.vehicle_id, "vehicle_id");
        }

        await assertBiltyRelations(companyId, data);

        await withTransaction(async (connection) => {
            const updated = await biltyModel.updateBilty(
                req.params.id,
                companyId,
                data,
                connection
            );

            if (!updated) {
                throw new HttpError(404, "Bilty not found");
            }

            if (req.body.charges !== undefined) {
                await biltyModel.replaceBiltyCharges(
                    companyId,
                    Number(req.params.id),
                    data.charges || [],
                    connection
                );
            }

            await writeAudit(
                req,
                "BILTY_UPDATED",
                "bilty",
                req.params.id,
                status ? `${existing.status} -> ${nextStatus}` : null,
                { companyId, connection, required: true }
            );
        });

        const bilty = await biltyModel.getBiltyWithCharges(req.params.id, companyId);

        return res.status(200).json({
            success: true,
            message: "Bilty updated successfully",
            bilty
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
    getBiltyPrint,
    reserveBilty,
    reserveBiltyRange,
    createBilty,
    updateBilty,
    deactivateBilty
};
