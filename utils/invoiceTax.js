const { isValidAmount, roundMoney, toNumber } = require("./validation");

const buildGstTaxes = ({
    taxes,
    subtotal,
    taxAmount,
    taxPreference = "AUTO",
    cgstAmount,
    sgstAmount,
    igstAmount
}) => {
    if (Array.isArray(taxes) && taxes.length) {
        return taxes.map((tax) => ({
            tax_type: String(tax.tax_type || "GST").toUpperCase(),
            tax_rate: isValidAmount(tax.tax_rate) ? roundMoney(tax.tax_rate) : 0,
            taxable_amount: isValidAmount(tax.taxable_amount)
                ? roundMoney(tax.taxable_amount)
                : subtotal,
            tax_amount: isValidAmount(tax.tax_amount)
                ? roundMoney(tax.tax_amount)
                : 0
        }));
    }

    const preference = String(taxPreference || "AUTO").toUpperCase();
    const explicitCgst = isValidAmount(cgstAmount) ? roundMoney(cgstAmount) : null;
    const explicitSgst = isValidAmount(sgstAmount) ? roundMoney(sgstAmount) : null;
    const explicitIgst = isValidAmount(igstAmount) ? roundMoney(igstAmount) : null;

    if (explicitCgst !== null || explicitSgst !== null || explicitIgst !== null) {
        const rows = [];
        if (explicitCgst) {
            rows.push({
                tax_type: "CGST",
                tax_rate: subtotal > 0 ? roundMoney((explicitCgst / subtotal) * 100) : 0,
                taxable_amount: subtotal,
                tax_amount: explicitCgst
            });
        }
        if (explicitSgst) {
            rows.push({
                tax_type: "SGST",
                tax_rate: subtotal > 0 ? roundMoney((explicitSgst / subtotal) * 100) : 0,
                taxable_amount: subtotal,
                tax_amount: explicitSgst
            });
        }
        if (explicitIgst) {
            rows.push({
                tax_type: "IGST",
                tax_rate: subtotal > 0 ? roundMoney((explicitIgst / subtotal) * 100) : 0,
                taxable_amount: subtotal,
                tax_amount: explicitIgst
            });
        }
        return rows;
    }

    const amount = isValidAmount(taxAmount) ? roundMoney(taxAmount) : 0;
    if (amount <= 0) {
        return [];
    }

    if (preference === "IGST") {
        return [
            {
                tax_type: "IGST",
                tax_rate: subtotal > 0 ? roundMoney((amount / subtotal) * 100) : 0,
                taxable_amount: subtotal,
                tax_amount: amount
            }
        ];
    }

    if (preference === "CGST_SGST" || preference === "AUTO") {
        const half = roundMoney(amount / 2);
        const other = roundMoney(amount - half);
        return [
            {
                tax_type: "CGST",
                tax_rate: subtotal > 0 ? roundMoney((half / subtotal) * 100) : 0,
                taxable_amount: subtotal,
                tax_amount: half
            },
            {
                tax_type: "SGST",
                tax_rate: subtotal > 0 ? roundMoney((other / subtotal) * 100) : 0,
                taxable_amount: subtotal,
                tax_amount: other
            }
        ];
    }

    return [
        {
            tax_type: "GST",
            tax_rate: subtotal > 0 ? roundMoney((amount / subtotal) * 100) : 0,
            taxable_amount: subtotal,
            tax_amount: amount
        }
    ];
};

const sumTaxAmount = (taxes = []) =>
    roundMoney(
        taxes.reduce((sum, tax) => sum + toNumber(tax.tax_amount || 0), 0)
    );

module.exports = {
    buildGstTaxes,
    sumTaxAmount
};
