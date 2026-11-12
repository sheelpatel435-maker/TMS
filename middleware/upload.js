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

const validateUploadedFile = async (file) => {
    if (!file) return;

    try {
        const handle = await fs.promises.open(file.path, "r");
        const header = Buffer.alloc(12);
        try {
            await handle.read(header, 0, header.length, 0);
        } finally {
            await handle.close();
        }

        const bytes = header.subarray(0, header.length);
        const signatures = {
            "image/jpeg": bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
            "image/png": bytes.subarray(0, 8).equals(
                Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
            ),
            "image/webp":
                bytes.toString("ascii", 0, 4) === "RIFF" &&
                bytes.toString("ascii", 8, 12) === "WEBP",
            "application/pdf": bytes.toString("ascii", 0, 5) === "%PDF-"
        };

        if (signatures[file.mimetype]) return;
        throw new HttpError(400, "Uploaded file content does not match its file type");
    } catch (error) {
        try {
            await fs.promises.unlink(file.path);
        } catch (cleanupError) {
            if (cleanupError.code !== "ENOENT") {
                console.error("UPLOAD CLEANUP ERROR:", cleanupError);
            }
        }
        if (error instanceof HttpError) throw error;
        throw error;
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 8 * 1024 * 1024, files: 1 }
});

const publicFileUrl = (filename) => `/api/files/${filename}`;

module.exports = {
    upload,
    validateUploadedFile,
    publicFileUrl,
    uploadDir
};
