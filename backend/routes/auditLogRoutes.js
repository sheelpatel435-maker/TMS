const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middleware/authMiddleware");
const { requireAdmin } = require("../../utils/roles");
const controller = require("../../controllers/auditLogController");

router.use(authMiddleware);
router.use(requireAdmin);

router.get("/", controller.getAuditLogs);

module.exports = router;
