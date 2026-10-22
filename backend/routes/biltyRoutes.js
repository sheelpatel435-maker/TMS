const express = require("express");
const router = express.Router();

const controller = require("../../controllers/biltyController");
const authMiddleware = require("../../middleware/authMiddleware");

router.get("/", authMiddleware, controller.getBilties);

router.post("/", authMiddleware, controller.createBilty);

module.exports = router;
