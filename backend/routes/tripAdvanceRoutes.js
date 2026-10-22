const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middleware/authMiddleware");
const controller = require("../../controllers/tripAdvanceController");

router.use(authMiddleware);

router.post("/", controller.createAdvance);
router.get("/", controller.getAdvances);
router.get("/:id", controller.getAdvanceById);
router.patch("/:id/status", controller.updateStatus);

module.exports = router;
