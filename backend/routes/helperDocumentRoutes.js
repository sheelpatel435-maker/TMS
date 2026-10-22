const express = require("express");
const router = express.Router();

const controller = require("../../controllers/helperDocumentController");
const authMiddleware = require("../../middleware/authMiddleware");

router.get(
    "/:helperId",
    authMiddleware,
    controller.getHelperDocuments
);

router.post(
    "/:helperId",
    authMiddleware,
    controller.createHelperDocument
);

module.exports = router;