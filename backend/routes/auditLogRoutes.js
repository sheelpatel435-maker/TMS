const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middleware/authMiddleware");
const requireModule = require("../../middleware/requireModule");
const controller = require("../../controllers/auditLogController");

router.use(authMiddleware);
router.use(requireModule("Audit Logs", "can_view"));

router.get("/", controller.getAuditLogs);

module.exports = router;
