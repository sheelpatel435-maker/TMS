const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { HttpError } = require("../utils/httpError");

const uploadDir = path.join(__dirname, "../backend/uploads");

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const ALLOWED_MIME = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf"
]);

const EXT_BY_MIME = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "application/pdf": ".pdf"
};

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
        const ext =
            EXT_BY_MIME[file.mimetype] ||
            path.extname(file.originalname).toLowerCase() ||
            "";
        cb(null, `${Date.now()}-${crypto.randomBytes(12).toString("hex")}${ext}`);
    }
});

const fileFilter = (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
        return cb(
            new HttpError(400, "Only JPEG, PNG, WebP, or PDF files are allowed")
        );
    }

    return cb(null, true);
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 8 * 1024 * 1024, files: 1 }
});

const publicFileUrl = (filename) => `/api/files/${filename}`;

module.exports = {
    upload,
    publicFileUrl,
    uploadDir
};
