const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const controller = require("../controllers/tripExpenseController");

router.use(authMiddleware);

router.post("/", controller.createExpense);
router.get("/", controller.getExpenses);
router.get("/:id", controller.getExpenseById);
router.patch("/:id/status", controller.updateStatus);

module.exports = router;
