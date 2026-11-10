const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middleware/authMiddleware");
const controller = require("../../controllers/userModuleAccessController");
const { requireAdmin } = require("../../utils/roles");

router.use(authMiddleware);

router.get("/", controller.getUserAccess);
router.post("/", requireAdmin, controller.createUserAccess);
router.delete("/:id", requireAdmin, controller.deleteUserAccess);
router.get("/:userId", controller.getUserAccess);

module.exports = router;
