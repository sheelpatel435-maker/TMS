const express = require("express");
const router = express.Router();

const controller = require("../../controllers/clientController");
const authMiddleware = require("../../middleware/authMiddleware");

router.get("/", authMiddleware, controller.getClients);

router.post("/", authMiddleware, controller.createClient);

module.exports = router;
