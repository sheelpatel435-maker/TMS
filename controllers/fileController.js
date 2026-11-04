const fs = require("fs");
const path = require("path");
const db = require("../config/db");
const { uploadDir } = require("../middleware/upload");
const { sendError, HttpError } = require("../utils/httpError");
const { resolveCompanyId } = require("../utils/companyScope");
const { isSuperAdmin } = require("../utils/roles");

const SAFE_NAME = /^[a-zA-Z0-9._-]+$/;
const DOC_TABLES = [
    "driver_documents",
    "helper_documents",
    "vehicle_documents"
];

const companyOwnsFile = async (companyId, filename) => {
    const patterns = [
        `%/uploads/${filename}`,
        `%/api/files/${filename}`,
        filename
    ];

    for (const table of DOC_TABLES) {
        const [rows] = await db.execute(
            `SELECT id FROM ${table}
             WHERE company_id = ?
               AND (
                    document_url LIKE ?
                    OR document_url LIKE ?
                    OR document_url = ?
               )
             LIMIT 1`,
            [companyId, ...patterns]
        );

        if (rows[0]) {
            return true;
        }
    }

    return false;
};

const downloadFile = async (req, res) => {
    try {
        const filename = path.basename(String(req.params.filename || ""));

        if (!filename || !SAFE_NAME.test(filename)) {
            throw new HttpError(400, "Invalid file name");
        }

        const root = path.resolve(uploadDir);
        const absolute = path.resolve(uploadDir, filename);

        if (
            absolute !== root &&
            !absolute.startsWith(root + path.sep)
        ) {
            throw new HttpError(400, "Invalid file name");
        }

        if (!fs.existsSync(absolute)) {
            throw new HttpError(404, "File not found");
        }

        if (!isSuperAdmin(req.user)) {
            const companyId = resolveCompanyId(req);
            const allowed = await companyOwnsFile(companyId, filename);

            if (!allowed) {
                throw new HttpError(403, "Access denied");
            }
        }

        return res.sendFile(absolute);
    } catch (error) {
        return sendError(res, error);
    }
};

module.exports = {
    downloadFile
};
