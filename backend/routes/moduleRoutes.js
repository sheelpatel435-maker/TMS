const express = require("express");
const router = express.Router();

const moduleController = require("../controllers/moduleController");
const authMiddleware = require("../middleware/authMiddleware");

router.get(
    "/",
    authMiddleware,
    moduleController.getModules
);

module.exports = router;