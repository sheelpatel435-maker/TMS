const express = require("express");
const router = express.Router();

const controller = require("../../controllers/clientController");
const authMiddleware = require("../../middleware/authMiddleware");
const requireModule = require("../../middleware/requireModule");

router.use(authMiddleware);

router.get("/", requireModule("Clients", "can_view"), controller.getClients);
router.post("/", requireModule("Clients", "can_create"), controller.createClient);
router.get("/:id", requireModule("Clients", "can_view"), controller.getClientById);
router.put("/:id", requireModule("Clients", "can_update"), controller.updateClient);
router.delete("/:id", requireModule("Clients", "can_delete"), controller.deactivateClient);

module.exports = router;
