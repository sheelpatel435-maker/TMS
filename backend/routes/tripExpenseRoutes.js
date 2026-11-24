const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middleware/authMiddleware");
const requireModule = require("../../middleware/requireModule");
const controller = require("../../controllers/tripExpenseController");
const typeController = require("../../controllers/tripExpenseTypeController");
const { upload } = require("../../middleware/upload");

router.use(authMiddleware);

router.get(
    "/types",
    requireModule("Trip Expenses", "can_view"),
    typeController.getExpenseTypes
);
router.post(
    "/types",
    requireModule("Trip Expenses", "can_create"),
    typeController.createExpenseType
);
router.delete(
    "/types/:id",
    requireModule("Trip Expenses", "can_update"),
    typeController.deactivateExpenseType
);

router.post(
    "/",
    requireModule("Trip Expenses", "can_create"),
    upload.single("file"),
    controller.createExpense
);
router.get("/", requireModule("Trip Expenses", "can_view"), controller.getExpenses);
router.get("/:id", requireModule("Trip Expenses", "can_view"), controller.getExpenseById);
router.patch("/:id/status", requireModule("Trip Expenses", "can_approve"), controller.updateStatus);
// BRD: financial records must not be physically deleted — no DELETE route

module.exports = router;
