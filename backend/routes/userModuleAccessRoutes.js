const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middleware/authMiddleware");
const controller = require("../../controllers/userModuleAccessController");
const { requireAdmin } = require("../../utils/roles");

router.use(authMiddleware);

router.get("/", controller.getUserAccess);
router.get("/:userId", controller.getUserAccess);
router.post("/", requireAdmin, controller.createUserAccess);

module.exports = router;
