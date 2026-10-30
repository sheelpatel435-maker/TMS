const express = require("express");
const router = express.Router();

const controller = require("../../controllers/helperDocumentController");
const authMiddleware = require("../../middleware/authMiddleware");
const requireModule = require("../../middleware/requireModule");
const { upload } = require("../../middleware/upload");

router.get(
    "/:helperId",
    authMiddleware,
    requireModule("Helpers", "can_view"),
    controller.getHelperDocuments
);

router.post(
    "/:helperId",
    authMiddleware,
    requireModule("Helpers", "can_create"),
    upload.single("file"),
    controller.createHelperDocument
);

module.exports = router;
