

const sendSms = async (mobile, message) => {
    const provider = String(process.env.SMS_PROVIDER || "").trim().toLowerCase();

    if (!provider || provider === "console") {
        if (process.env.NODE_ENV === "production") {
            throw new Error("SMS provider is not configured");
        }

        console.log(`[SMS:console] to=${mobile} message=${message}`);
        return;
    }

   

    throw new Error(`SMS provider "${provider}" is not implemented`);
};

module.exports = { sendSms };