const nodemailer = require("nodemailer");
const { HttpError } = require("./httpError");

const sendMail = async ({ to, subject, html, text }) => {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.MAIL_FROM || user;

    if (!host || !user || !pass || !from) {
        throw new HttpError(500, "Mail is not configured");
    }

    const transporter = nodemailer.createTransport({
        host,
        port: Number(process.env.SMTP_PORT || 587),
        secure: String(process.env.SMTP_PORT) === "465",
        auth: { user, pass }
    });

    await transporter.sendMail({
        from: `"${process.env.MAIL_FROM_NAME || "TMS"}" <${from}>`,
        to,
        subject,
        text,
        html
    });
};

const sendPasswordOtp = async (to, name, otp) => {
    const minutes = 10;

    await sendMail({
        to,
        subject: "TMS password reset OTP",
        text: `Your TMS password reset OTP is ${otp}. It expires in ${minutes} minutes.`,
        html: `<p>Hello ${name || "there"},</p>
<p>Your password reset OTP is <b>${otp}</b>.</p>
<p>It expires in ${minutes} minutes. If you did not request this, ignore this email.</p>`
    });
};

module.exports = {
    sendMail,
    sendPasswordOtp
};
