const express = require("express");
const router = express.Router();

const controller = require("../../controllers/helperDocumentController");
const authMiddleware = require("../../middleware/authMiddleware");
const requireModule = require("../../middleware/requireModule");
const { upload } = require("../../middleware/upload");

router.use(authMiddleware);

router.put(
    "/:id",
    requireModule("Helpers", "can_update"),
    upload.single("file"),
    controller.updateHelperDocument
);
router.delete(
    "/:id",
    requireModule("Helpers", "can_delete"),
    controller.deactivateHelperDocument
);
router.get(
    "/:helperId",
    requireModule("Helpers", "can_view"),
    controller.getHelperDocuments
);
router.post(
    "/:helperId",
    requireModule("Helpers", "can_create"),
    upload.single("file"),
    controller.createHelperDocument
);

module.exports = router;
