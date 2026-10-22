class HttpError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

const sendError = (res, error) => {
    if (error instanceof HttpError || error.status) {
        return res.status(error.status).json({
            success: false,
            message: error.message
        });
    }

    if (error && error.code === "ER_DUP_ENTRY") {
        return res.status(409).json({
            success: false,
            message: "A record with these details already exists"
        });
    }

    console.error(error);

    return res.status(500).json({
        success: false,
        message: "Server error"
    });
};

module.exports = {
    HttpError,
    sendError
};
