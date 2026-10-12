const express = require("express");
const router = express.Router();

const controller = require("../controllers/helperController");
const authMiddleware = require("../middleware/authMiddleware");

router.get(
    "/",
    authMiddleware,
    controller.getHelpers
);

router.post(
    "/",
    authMiddleware,
    controller.createHelper
);

module.exports = router;