const { HttpError } = require("./httpError");
const { roundMoney } = require("./validation");
const { isoDate } = require("./vehicleValidation");

const COPY_TYPES = new Set(["CONSIGNOR", "CONSIGNEE", "DRIVER", "OFFICE"]);
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
        copy_type:
            optionalEnum(pick("copy_type", "CONSIGNOR"), COPY_TYPES, "copy_type") ||
            "CONSIGNOR",
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

const buildPrintPayload = (bilty, company = null) => ({
    sections: {
        header: {
            company_name: company?.name || null,
            company_address: company?.address || null,
            company_phone: company?.phone || company?.mobile || null,
            company_email: company?.email || null,
            gstin: company?.gstin || company?.gst_number || null,
            pan: company?.pan || company?.pan_number || null,
            bilty_number: bilty.bilty_number,
            bilty_date: bilty.bilty_date,
            copy_type: bilty.copy_type
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
    },
    bilty
});

module.exports = {
    COPY_TYPES,
    PAYMENT_MODES,
    GST_PAYERS,
    DELIVERY_TYPES,
    INSURANCE_RISKS,
    CHARGE_TYPES,
    normalizeBiltyPayload,
    buildPrintPayload,
    sumCharges
};
