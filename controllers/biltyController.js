const biltyModel = require("../models/biltyModel");
const biltyCopySettingsModel = require("../models/biltyCopySettingsModel");
const biltySequenceModel = require("../models/biltySequenceModel");
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
    assertConfirmReady,
    buildPrintPayload,
    parseRequestedCopies,
    normalizeCopyType,
    PRINT_COPY_TYPES,
    isHexColor
} = require("../utils/biltyFields");
const { positiveInteger } = require("../utils/vehicleValidation");

const LOCKED_BILTY_STATUSES = new Set(["CONFIRMED", "USED", "COMPLETED"]);

const todayIsoDate = () => new Date().toISOString().slice(0, 10);

const bodyKeysHasDetails = (body) => {
    const ignore = new Set(["status", "bilty_number", "copy_type", "bilty_date"]);
    return Object.keys(body || {}).some((key) => !ignore.has(key));
};

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

const resolvePrintOptions = async (req, companyId) => {
    const rawCopies =
        req.body?.copies ??
        req.query?.copies ??
        req.query?.copy ??
        "ALL";
    const selectedCopies = parseRequestedCopies(rawCopies);
    const copySettings = await biltyCopySettingsModel.ensureDefaults(companyId);

    const colorOverrides = {};
    const rawColors = req.body?.colors || req.query?.colors;
    if (rawColors && typeof rawColors === "object" && !Array.isArray(rawColors)) {
        for (const [key, value] of Object.entries(rawColors)) {
            const copyType = normalizeCopyType(key);
            if (!PRINT_COPY_TYPES.includes(copyType)) continue;
            if (!isHexColor(value)) {
                throw new HttpError(
                    400,
                    `colors.${copyType} must be a hex color like #F8C8DC`
                );
            }
            colorOverrides[copyType] = String(value).trim();
        }
    }

    return { selectedCopies, copySettings, colorOverrides };
};

const getBiltyPrint = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const bilty = await biltyModel.getBiltyWithCharges(req.params.id, companyId);
        if (!bilty) {
            throw new HttpError(404, "Bilty not found");
        }

        const company = await companyModel.getById(companyId);
        const options = await resolvePrintOptions(req, companyId);

        return res.status(200).json({
            success: true,
            print: buildPrintPayload(bilty, company, options)
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const postBiltyPrint = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const bilty = await biltyModel.getBiltyWithCharges(req.params.id, companyId);
        if (!bilty) {
            throw new HttpError(404, "Bilty not found");
        }

        const company = await companyModel.getById(companyId);
        const options = await resolvePrintOptions(req, companyId);

        return res.status(200).json({
            success: true,
            print: buildPrintPayload(bilty, company, options)
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const getBiltyCopySettings = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const copies = await biltyCopySettingsModel.ensureDefaults(companyId);
        return res.status(200).json({
            success: true,
            copies,
            available_copies: PRINT_COPY_TYPES
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const updateBiltyCopySettings = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const rows = req.body?.copies;
        if (!Array.isArray(rows) || !rows.length) {
            throw new HttpError(400, "copies array is required");
        }

        const normalized = rows.map((row, index) => {
            const copy_type = normalizeCopyType(row.copy_type);
            if (!PRINT_COPY_TYPES.includes(copy_type)) {
                throw new HttpError(
                    400,
                    `copies[${index}].copy_type must be one of ${PRINT_COPY_TYPES.join(", ")}`
                );
            }
            if (!isHexColor(row.color_hex)) {
                throw new HttpError(
                    400,
                    `copies[${index}].color_hex must be like #FFFFFF or #F8C8DC`
                );
            }
            return {
                copy_type,
                label: String(row.label || `${copy_type} Copy`).trim().slice(0, 80),
                color_hex: String(row.color_hex).trim(),
                color_name: row.color_name
                    ? String(row.color_name).trim().slice(0, 40)
                    : null,
                sort_order:
                    row.sort_order === undefined || row.sort_order === null
                        ? index + 1
                        : Number(row.sort_order),
                status: row.status === 0 || row.status === "0" ? 0 : 1
            };
        });

        const copies = await biltyCopySettingsModel.upsertSettings(
            companyId,
            normalized
        );
        await writeAudit(req, "BILTY_COPY_SETTINGS_UPDATED", "bilty_copy_settings", companyId);

        return res.status(200).json({
            success: true,
            message: "Bilty copy colors saved",
            copies
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const getBiltySequence = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const sequence = await biltySequenceModel.getSequence(companyId);
        return res.status(200).json({ success: true, sequence });
    } catch (error) {
        return sendError(res, error);
    }
};

const updateBiltySequence = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const { prefix, next_number, pad_width } = req.body || {};
        try {
            const sequence = await biltySequenceModel.updateSequence(companyId, {
                prefix,
                next_number,
                pad_width
            });
            await writeAudit(req, "BILTY_SEQUENCE_UPDATED", "bilty_sequences", companyId);
            return res.status(200).json({
                success: true,
                message: "Bilty sequence updated",
                sequence
            });
        } catch (err) {
            throw new HttpError(400, err.message || "Invalid sequence settings");
        }
    } catch (error) {
        return sendError(res, error);
    }
};

const reserveBilty = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const manualNumber = req.body?.bilty_number;
        const biltyDate = req.body?.bilty_date || todayIsoDate();

        const { id, bilty_number } = await withTransaction(async (connection) => {
            let number = !isMissing(manualNumber)
                ? String(manualNumber).trim()
                : await biltySequenceModel.allocateNextNumber(companyId, connection);

            const existing = await biltyModel.findByNumber(
                companyId,
                number,
                connection
            );
            if (existing) {
                throw new HttpError(409, "Bilty number already exists");
            }

            const createdId = await biltyModel.createBilty(
                companyId,
                {
                    bilty_number: number,
                    bilty_date: biltyDate,
                    status: "RESERVED",
                    reserved_by: req.user?.id || null,
                    created_by: req.user?.id || null
                },
                connection
            );

            await writeAudit(req, "BILTY_RESERVED", "bilty", createdId, undefined, {
                companyId,
                connection,
                required: true
            });

            return { id: createdId, bilty_number: number };
        });

        return res.status(201).json({
            success: true,
            message: "Bilty number reserved successfully",
            id,
            bilty_number
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
        const { from, to, bilty_numbers, count, bilty_date } = req.body || {};
        const biltyDate = bilty_date || todayIsoDate();

        const result = await withTransaction(async (connection) => {
            let numbers = [];

            if (!isMissing(count)) {
                const n = Number(count);
                if (!Number.isInteger(n) || n < 1) {
                    throw new HttpError(400, "count must be a positive integer");
                }
                if (n > 200) {
                    throw new HttpError(400, "Reserve at most 200 bilty numbers at once");
                }
                numbers = await biltySequenceModel.allocateNextNumbers(
                    companyId,
                    n,
                    connection
                );
            } else if (Array.isArray(bilty_numbers) && bilty_numbers.length) {
                numbers = [
                    ...new Set(
                        bilty_numbers
                            .map((value) => String(value).trim())
                            .filter(Boolean)
                    )
                ];
            } else if (!isMissing(from) && !isMissing(to)) {
                numbers = expandRange(from, to);
            } else {
                throw new HttpError(
                    400,
                    "Provide count (auto), from/to, or bilty_numbers[]"
                );
            }

            if (numbers.length > 200) {
                throw new HttpError(400, "Reserve at most 200 bilty numbers at once");
            }

            const reserved = [];
            const skipped = [];

            for (const bilty_number of numbers) {
                const existing = await biltyModel.findByNumber(
                    companyId,
                    bilty_number,
                    connection
                );
                if (existing) {
                    skipped.push(bilty_number);
                    continue;
                }

                const id = await biltyModel.createBilty(
                    companyId,
                    {
                        bilty_number,
                        bilty_date: biltyDate,
                        status: "RESERVED",
                        reserved_by: req.user?.id || null,
                        created_by: req.user?.id || null
                    },
                    connection
                );
                reserved.push({ id, bilty_number });
                await writeAudit(req, "BILTY_RESERVED", "bilty", id, undefined, {
                    companyId,
                    connection,
                    required: true
                });
            }

            return { reserved, skipped };
        });

        return res.status(201).json({
            success: true,
            message: `Reserved ${result.reserved.length} bilty number(s)`,
            reserved: result.reserved,
            skipped: result.skipped
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
        const { bilty_number, status } = req.body || {};

        const biltyStatus = normalizeStatus("bilty", status || "DRAFT");

        if (!isAllowedStatus("bilty", biltyStatus)) {
            throw new HttpError(400, "Invalid bilty status");
        }

        if (!["DRAFT", "CREATED", "CONFIRMED", "RESERVED"].includes(biltyStatus)) {
            throw new HttpError(400, "New bilty must start as RESERVED or DRAFT");
        }

        // copy_type is print-only — strip from create body
        const body = { ...(req.body || {}) };
        delete body.copy_type;

        const id = await withTransaction(async (connection) => {
            let number = !isMissing(bilty_number)
                ? String(bilty_number).trim()
                : await biltySequenceModel.allocateNextNumber(companyId, connection);

            const existing = await biltyModel.findByNumber(
                companyId,
                number,
                connection
            );
            if (existing) {
                throw new HttpError(409, "Bilty number already exists");
            }

            const data = normalizeBiltyPayload({
                ...body,
                bilty_number: number,
                bilty_date: body.bilty_date || todayIsoDate()
            });
            data.bilty_number = number;
            data.status = biltyStatus;
            data.created_by = req.user?.id || null;
            if (biltyStatus === "RESERVED") {
                data.reserved_by = req.user?.id || null;
            }

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

            if (["CONFIRMED", "USED"].includes(biltyStatus)) {
                assertConfirmReady(data);
            }

            const createdId = await biltyModel.createBilty(
                companyId,
                data,
                connection
            );
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
        const { status } = req.body || {};

        const existing = await biltyModel.getBiltyWithCharges(req.params.id, companyId);

        if (!existing) {
            throw new HttpError(404, "Bilty not found");
        }

        if (existing.status === "CANCELLED") {
            throw new HttpError(400, "Cancelled bilty cannot be edited");
        }

        let nextStatus = existing.status;

        if (status) {
            nextStatus = normalizeStatus("bilty", status);

            if (!isAllowedStatus("bilty", nextStatus)) {
                throw new HttpError(400, "Invalid bilty status");
            }

            assertTransition("bilty", existing.status, nextStatus);
        }

        // Confirmed/used: only allow trip link / status USED transition, not field edits
        if (LOCKED_BILTY_STATUSES.has(existing.status)) {
            const bodyKeys = Object.keys(req.body || {}).filter(
                (key) => !["status", "trip_id"].includes(key)
            );
            if (bodyKeys.length) {
                throw new HttpError(
                    400,
                    "Confirmed/used bilty is locked; only print/POD or trip link allowed"
                );
            }
        }

        const body = { ...(req.body || {}) };
        delete body.copy_type;

        const data = normalizeBiltyPayload(body, existing);
        data.bilty_number = existing.bilty_number;
        data.status = nextStatus;
        data.cancel_reason = existing.cancel_reason || null;

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

        if (
            ["CONFIRMED", "USED"].includes(nextStatus) &&
            nextStatus !== existing.status
        ) {
            assertConfirmReady({
                ...data,
                charges:
                    body.charges !== undefined
                        ? data.charges
                        : existing.charges || []
            });
        }

        // Opening a reserved bilty moves to DRAFT automatically if details posted
        if (existing.status === "RESERVED" && !status && bodyKeysHasDetails(body)) {
            nextStatus = "DRAFT";
            data.status = "DRAFT";
            assertTransition("bilty", "RESERVED", "DRAFT");
        }

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
                existing.status !== nextStatus
                    ? `${existing.status} -> ${nextStatus}`
                    : null,
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

        const cancelReason = String(
            req.body?.cancel_reason || req.body?.reason || ""
        ).trim();
        if (!cancelReason) {
            throw new HttpError(400, "cancel_reason is required");
        }

        assertTransition("bilty", bilty.status, "CANCELLED");

        const updated = await biltyModel.deactivateBilty(
            req.params.id,
            companyId,
            cancelReason
        );

        if (!updated) {
            throw new HttpError(400, "Bilty could not be cancelled");
        }

        await writeAudit(
            req,
            "BILTY_CANCELLED",
            "bilty",
            req.params.id,
            cancelReason
        );

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
    postBiltyPrint,
    getBiltyCopySettings,
    updateBiltyCopySettings,
    getBiltySequence,
    updateBiltySequence,
    reserveBilty,
    reserveBiltyRange,
    createBilty,
    updateBilty,
    deactivateBilty
};
