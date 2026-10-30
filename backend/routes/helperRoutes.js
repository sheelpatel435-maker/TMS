const express = require("express");
const router = express.Router();

const controller = require("../../controllers/helperController");
const authMiddleware = require("../../middleware/authMiddleware");
const requireModule = require("../../middleware/requireModule");

router.use(authMiddleware);

router.get("/", requireModule("Helpers", "can_view"), controller.getHelpers);
router.post("/", requireModule("Helpers", "can_create"), controller.createHelper);
router.get("/:id", requireModule("Helpers", "can_view"), controller.getHelperById);
router.put("/:id", requireModule("Helpers", "can_update"), controller.updateHelper);
router.delete("/:id", requireModule("Helpers", "can_delete"), controller.deactivateHelper);

module.exports = router;
