const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middleware/authMiddleware");
const controller = require("../../controllers/companyController");

router.use(authMiddleware);

router.get("/", controller.listCompanies);
router.get("/:id", controller.getCompany);
router.post("/", controller.createCompany);
router.put("/:id", controller.updateCompany);
router.delete("/:id", controller.deactivateCompany);

module.exports = router;
