const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middleware/authMiddleware");
const requireModule = require("../../middleware/requireModule");
const controller = require("../../controllers/reportController");

router.use(authMiddleware);

router.get("/trips", requireModule("Reports", "can_view"), controller.getTripReport);
router.get("/finance", requireModule("Reports", "can_export"), controller.getFinanceReport);
router.get("/trip/:id", requireModule("Reports", "can_view"), controller.getTripFinanceReport);

module.exports = router;
