const { HttpError } = require("./httpError");
const { roundMoney } = require("./validation");
const { isoDate } = require("./vehicleValidation");

const COPY_TYPES = new Set([
    "CONSIGNOR",
    "CONSIGNEE",
    "DRIVER",
    "TRANSPORT",
    "OFFICE" // legacy alias → treated as TRANSPORT in print
]);

const PRINT_COPY_TYPES = Object.freeze([
    "CONSIGNOR",
    "CONSIGNEE",
    "DRIVER",
    "TRANSPORT"
]);

const normalizeCopyType = (value) => {
    const raw = String(value || "")
        .trim()
        .toUpperCase()
        .replace(/[\s-]+/g, "_");
    if (raw === "OFFICE" || raw === "TRANSPORT_COPY" || raw === "TRANSPORT") {
        return "TRANSPORT";
    }
    if (raw === "ALL") return "ALL";
    return raw;
};
const PAYMENT_MODES = new Set(["TO_PAY", "PAID", "TO_BE_BILLED"]);
const GST_PAYERS = new Set(["CONSIGNOR", "CONSIGNEE", "TRANSPORT_OPERATOR"]);
const DELIVERY_TYPES = new Set(["DOOR_DELIVERY", "GODOWN"]);
const INSURANCE_RISKS = new Set(["CARRIER", "OWNER"]);
const CHARGE_TYPES = new Set([
    "FREIGHT",
    "LABOUR",
    "SURCHARGE",
    "ST_CHARGE",
    "RISK_CHARGE",
    "GR_CHARGE",
    "OTHER"
]);

const optionalEnum = (value, allowed, fieldName) => {
    if (value === undefined || value === null || value === "") {
        return null;
    }
    const normalized = String(value).trim().toUpperCase().replace(/[\s-]+/g, "_");
    if (!allowed.has(normalized)) {
        throw new HttpError(
            400,
            `${fieldName} must be one of: ${[...allowed].join(", ")}`
        );
    }
    return normalized;
};

const optionalNumber = (value, fieldName) => {
    if (value === undefined || value === null || value === "") {
        return null;
    }
    const num = Number(value);
    if (!Number.isFinite(num) || num < 0) {
        throw new HttpError(400, `${fieldName} must be a non-negative number`);
    }
    return num;
};

const optionalInt = (value, fieldName) => {
    if (value === undefined || value === null || value === "") {
        return null;
    }
    const num = Number(value);
    if (!Number.isInteger(num) || num < 0) {
        throw new HttpError(400, `${fieldName} must be a non-negative integer`);
    }
    return num;
};

const trimOrNull = (value, max = 255) => {
    if (value === undefined || value === null || value === "") return null;
    const text = String(value).trim();
    if (!text) return null;
    if (text.length > max) {
        throw new HttpError(400, `Value must be at most ${max} characters`);
    }
    return text;
};

const normalizeCharges = (charges) => {
    if (charges === undefined || charges === null) {
        return null;
    }
    if (!Array.isArray(charges)) {
        throw new HttpError(400, "charges must be an array");
    }

    const normalized = [];
    for (const row of charges) {
        const charge_type = optionalEnum(
            row?.charge_type,
            CHARGE_TYPES,
            "charge_type"
        );
        if (!charge_type) {
            throw new HttpError(400, "Each charge needs charge_type");
        }
        const amount = optionalNumber(row?.amount, "amount") ?? 0;
        normalized.push({
            charge_type,
            amount: roundMoney(amount)
        });
    }
    return normalized;
};

const sumCharges = (charges) =>
    roundMoney(
        (charges || []).reduce((total, row) => total + Number(row.amount || 0), 0)
    );

/**
 * Normalize 5-section bilty payload.
 * existing is used on update to keep unspecified fields.
 */
const normalizeBiltyPayload = (body, existing = null) => {
    const pick = (key, fallback = null) =>
        body[key] !== undefined ? body[key] : existing ? existing[key] : fallback;

    const charges =
        body.charges !== undefined
            ? normalizeCharges(body.charges)
            : existing?.charges
              ? existing.charges.map((c) => ({
                    charge_type: c.charge_type,
                    amount: Number(c.amount)
                }))
              : null;

    const freight_amount = optionalNumber(pick("freight_amount"), "freight_amount");
    let total_amount = optionalNumber(pick("total_amount"), "total_amount");

    if (charges && charges.length && (total_amount === null || body.charges)) {
        total_amount = sumCharges(charges);
    }

    if (
        freight_amount != null &&
        charges &&
        !charges.some((c) => c.charge_type === "FREIGHT")
    ) {
        charges.unshift({ charge_type: "FREIGHT", amount: roundMoney(freight_amount) });
        total_amount = sumCharges(charges);
    }

    return {
        bilty_number: trimOrNull(pick("bilty_number"), 50),
        bilty_date: isoDate(pick("bilty_date"), "bilty_date"),
        copy_type: (() => {
            const raw = pick("copy_type", "CONSIGNOR");
            if (raw === undefined || raw === null || raw === "") return "CONSIGNOR";
            const normalized = normalizeCopyType(raw);
            if (!COPY_TYPES.has(normalized) && normalized !== "TRANSPORT") {
                throw new HttpError(
                    400,
                    `copy_type must be one of: ${[...PRINT_COPY_TYPES].join(", ")}`
                );
            }
            return normalized === "OFFICE" ? "TRANSPORT" : normalized;
        })(),
        client_id: pick("client_id") || null,
        trip_id: pick("trip_id") || null,
        vehicle_id: pick("vehicle_id") || null,
        truck_no: trimOrNull(pick("truck_no"), 50),
        goods_description: trimOrNull(pick("goods_description"), 255),
        weight_kg: optionalNumber(pick("weight_kg"), "weight_kg"),
        charged_weight_kg: optionalNumber(
            pick("charged_weight_kg"),
            "charged_weight_kg"
        ),
        packages: optionalInt(pick("packages"), "packages"),
        packages_label: trimOrNull(pick("packages_label"), 50),
        rate_remark: trimOrNull(pick("rate_remark"), 150),
        freight_amount,
        total_amount,
        consignor: trimOrNull(pick("consignor"), 150),
        consignor_address: trimOrNull(pick("consignor_address"), 255),
        consignee: trimOrNull(pick("consignee"), 150),
        consignee_address: trimOrNull(pick("consignee_address"), 255),
        pickup_location: trimOrNull(pick("pickup_location"), 150),
        drop_location: trimOrNull(pick("drop_location"), 150),
        invoice_no: trimOrNull(pick("invoice_no"), 100),
        invoice_value: trimOrNull(pick("invoice_value"), 150),
        payment_mode: optionalEnum(
            pick("payment_mode"),
            PAYMENT_MODES,
            "payment_mode"
        ),
        gst_payer: optionalEnum(pick("gst_payer"), GST_PAYERS, "gst_payer"),
        delivery_type: optionalEnum(
            pick("delivery_type"),
            DELIVERY_TYPES,
            "delivery_type"
        ),
        insurance_at_risk: optionalEnum(
            pick("insurance_at_risk"),
            INSURANCE_RISKS,
            "insurance_at_risk"
        ),
        insurance_company: trimOrNull(pick("insurance_company"), 150),
        insurance_policy_no: trimOrNull(pick("insurance_policy_no"), 100),
        insurance_date: isoDate(pick("insurance_date"), "insurance_date"),
        insurance_amount: optionalNumber(
            pick("insurance_amount"),
            "insurance_amount"
        ),
        terms_notes: trimOrNull(pick("terms_notes"), 2000),
        charges
    };
};

const buildSections = (bilty, company = null, copyType = null) => ({
    header: {
        company_name: company?.name || null,
        company_address: company?.address || null,
        company_phone: company?.phone || company?.mobile || null,
        company_email: company?.email || null,
        gstin: company?.gstin || company?.gst_number || null,
        pan: company?.pan || company?.pan_number || null,
        bilty_number: bilty.bilty_number,
        bilty_date: bilty.bilty_date,
        copy_type: copyType || normalizeCopyType(bilty.copy_type) || "CONSIGNOR"
    },
    party_route: {
        consignor: bilty.consignor,
        consignor_address: bilty.consignor_address,
        consignee: bilty.consignee,
        consignee_address: bilty.consignee_address,
        from: bilty.pickup_location,
        to: bilty.drop_location,
        truck_no: bilty.truck_no,
        vehicle_id: bilty.vehicle_id
    },
    goods: {
        packages: bilty.packages,
        packages_label: bilty.packages_label,
        description: bilty.goods_description,
        weight_kg: bilty.weight_kg,
        charged_weight_kg: bilty.charged_weight_kg,
        rate_remark: bilty.rate_remark,
        invoice_no: bilty.invoice_no,
        invoice_value: bilty.invoice_value
    },
    freight: {
        charges: bilty.charges || [],
        freight_amount: bilty.freight_amount,
        total_amount: bilty.total_amount,
        payment_mode: bilty.payment_mode,
        gst_payer: bilty.gst_payer
    },
    insurance_terms: {
        delivery_type: bilty.delivery_type,
        insurance_at_risk: bilty.insurance_at_risk,
        insurance_company: bilty.insurance_company,
        insurance_policy_no: bilty.insurance_policy_no,
        insurance_date: bilty.insurance_date,
        insurance_amount: bilty.insurance_amount,
        terms_notes: bilty.terms_notes
    }
});

const parseRequestedCopies = (rawCopies) => {
    if (rawCopies === undefined || rawCopies === null || rawCopies === "") {
        return [...PRINT_COPY_TYPES];
    }

    let list = rawCopies;
    if (typeof rawCopies === "string") {
        list = rawCopies.split(/[,\s]+/).filter(Boolean);
    }
    if (!Array.isArray(list) || !list.length) {
        throw new HttpError(400, "copies must be ALL or a list of copy types");
    }

    const normalized = list.map(normalizeCopyType);
    if (normalized.includes("ALL")) {
        return [...PRINT_COPY_TYPES];
    }

    const unique = [];
    for (const copy of normalized) {
        if (!PRINT_COPY_TYPES.includes(copy)) {
            throw new HttpError(
                400,
                `Invalid copy type ${copy}. Use CONSIGNOR, CONSIGNEE, DRIVER, TRANSPORT, or ALL`
            );
        }
        if (!unique.includes(copy)) unique.push(copy);
    }
    return unique;
};

const isHexColor = (value) =>
    typeof value === "string" && /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/.test(value.trim());

/**
 * Build multi-page print payload.
 * selectedCopies: e.g. ["CONSIGNOR","DRIVER"] or all 4
 * copySettings: rows from bilty_copy_settings (colors choosable per company)
 * colorOverrides: optional { CONSIGNOR: "#FFFFFF", ... } for one-off print
 */
const buildPrintPayload = (
    bilty,
    company = null,
    {
        selectedCopies = PRINT_COPY_TYPES,
        copySettings = [],
        colorOverrides = {}
    } = {}
) => {
    const settingsByType = Object.fromEntries(
        (copySettings || []).map((row) => [normalizeCopyType(row.copy_type), row])
    );

    const pages = selectedCopies.map((copyType, index) => {
        const setting = settingsByType[copyType] || {};
        const override = colorOverrides[copyType];
        const color_hex = isHexColor(override)
            ? override.trim()
            : setting.color_hex || "#FFFFFF";

        return {
            page: index + 1,
            copy_type: copyType,
            title: setting.label || `${copyType} Copy`,
            color_hex,
            color_name: setting.color_name || null,
            page_break_after: index < selectedCopies.length - 1,
            sections: buildSections(bilty, company, copyType)
        };
    });

    return {
        bilty_id: bilty.id,
        bilty_number: bilty.bilty_number,
        selected_copies: selectedCopies,
        page_count: pages.length,
        available_copies: PRINT_COPY_TYPES,
        pages,
        // single-template data (same on every page)
        sections: buildSections(bilty, company, selectedCopies[0]),
        bilty
    };
};

module.exports = {
    COPY_TYPES,
    PRINT_COPY_TYPES,
    PAYMENT_MODES,
    GST_PAYERS,
    DELIVERY_TYPES,
    INSURANCE_RISKS,
    CHARGE_TYPES,
    normalizeCopyType,
    parseRequestedCopies,
    isHexColor,
    normalizeBiltyPayload,
    buildPrintPayload,
    sumCharges
};
