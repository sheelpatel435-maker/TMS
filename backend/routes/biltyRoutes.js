const express = require("express");
const router = express.Router();

const controller = require("../../controllers/biltyController");
const authMiddleware = require("../../middleware/authMiddleware");
const requireModule = require("../../middleware/requireModule");

router.use(authMiddleware);

router.get("/", requireModule("Bilty", "can_view"), controller.getBilties);
router.post("/reserve", requireModule("Bilty", "can_create"), controller.reserveBilty);
router.post("/reserve-range", requireModule("Bilty", "can_create"), controller.reserveBiltyRange);
router.post("/", requireModule("Bilty", "can_create"), controller.createBilty);

router.get(
    "/copy-settings",
    requireModule("Bilty", "can_view"),
    controller.getBiltyCopySettings
);
router.put(
    "/copy-settings",
    requireModule("Bilty", "can_update"),
    controller.updateBiltyCopySettings
);

router.get("/:id/print", requireModule("Bilty", "can_view"), controller.getBiltyPrint);
router.post("/:id/print", requireModule("Bilty", "can_view"), controller.postBiltyPrint);
router.get("/:id", requireModule("Bilty", "can_view"), controller.getBiltyById);
router.put("/:id", requireModule("Bilty", "can_update"), controller.updateBilty);
router.delete("/:id", requireModule("Bilty", "can_delete"), controller.deactivateBilty);

module.exports = router;
