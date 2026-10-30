const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middleware/authMiddleware");
const requireModule = require("../../middleware/requireModule");
const controller = require("../../controllers/tripExpenseController");

router.use(authMiddleware);

router.post("/", requireModule("Trip Expenses", "can_create"), controller.createExpense);
router.get("/", requireModule("Trip Expenses", "can_view"), controller.getExpenses);
router.get("/:id", requireModule("Trip Expenses", "can_view"), controller.getExpenseById);
router.patch("/:id/status", requireModule("Trip Expenses", "can_approve"), controller.updateStatus);

module.exports = router;
