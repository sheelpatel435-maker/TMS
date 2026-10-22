const express = require("express");
const router = express.Router();

const moduleController = require("../../controllers/moduleController");
const authMiddleware = require("../../middleware/authMiddleware");
const { requireAdmin } = require("../../utils/roles");

router.get(
    "/",
    authMiddleware,
    requireAdmin,
    moduleController.getModules
);

module.exports = router;
