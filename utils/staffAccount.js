const bcrypt = require("bcryptjs");
const userModel = require("../models/userModel");
const { HttpError } = require("./httpError");
const { assertStrongPassword, BCRYPT_ROUNDS } = require("./password");
const { requireValidMobile, requireValidEmail } = require("./userValidation");

const createStaffLoginUser = async ({
    companyId,
    userType,
    name,
    mobile,
    email,
    password,
    connection = null
}) => {
    if (!["DRIVER", "HELPER"].includes(userType)) {
        throw new HttpError(400, "Staff login user_type must be DRIVER or HELPER");
    }

    const cleanMobile = requireValidMobile(mobile);
    const cleanEmail = requireValidEmail(email);
    const cleanPassword = assertStrongPassword(password);

    if (await userModel.findDuplicateContact(cleanMobile, cleanEmail)) {
        throw new HttpError(409, "Mobile number or email is already registered");
    }

    const passwordHash = await bcrypt.hash(cleanPassword, BCRYPT_ROUNDS);
    const userId = await userModel.createUser(
        {
            company_id: companyId,
            user_type: userType,
            name: String(name || "").trim(),
            mobile: cleanMobile,
            email: cleanEmail,
            password_hash: passwordHash
        },
        connection
    );

    return { userId, mobile: cleanMobile, email: cleanEmail };
};

module.exports = {
    createStaffLoginUser
};
