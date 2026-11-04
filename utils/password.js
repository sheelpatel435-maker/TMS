const { HttpError } = require("./httpError");

const BCRYPT_ROUNDS = 12;

const assertStrongPassword = (password) => {
    const value = String(password || "");

    if (value.length < 8) {
        throw new HttpError(400, "Password must be at least 8 characters");
    }

    if (!/[A-Za-z]/.test(value) || !/[0-9]/.test(value)) {
        throw new HttpError(
            400,
            "Password must include at least one letter and one number"
        );
    }

    return value;
};

module.exports = {
    BCRYPT_ROUNDS,
    assertStrongPassword
};
