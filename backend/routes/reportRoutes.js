const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middleware/authMiddleware");
const requireModule = require("../../middleware/requireModule");
const controller = require("../../controllers/reportController");

router.use(authMiddleware);
router.use(requireModule("Reports", "can_view"));

router.get("/trips", controller.getTripReport);
router.get("/finance", controller.getFinanceReport);
router.get("/trip/:id", controller.getTripFinanceReport);

module.exports = router;
