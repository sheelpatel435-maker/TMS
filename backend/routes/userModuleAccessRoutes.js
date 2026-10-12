const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const controller = require("../controllers/userModuleAccessController");

router.use(authMiddleware);

router.get("/", controller.getUserAccess);
router.get("/:userId", controller.getUserAccess);
router.post("/", controller.createUserAccess);

module.exports = router;
