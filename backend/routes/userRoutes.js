const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middleware/authMiddleware");
const { requireAdmin } = require("../../utils/roles");
const controller = require("../../controllers/userController");

router.use(authMiddleware);
router.use(requireAdmin);

router.get("/", controller.getUsers);
router.post("/", controller.createUser);
router.get("/:id", controller.getUserById);
router.put("/:id", controller.updateUser);
router.patch("/:id", controller.updateUser);
router.delete("/:id", controller.deactivateUser);

module.exports = router;
