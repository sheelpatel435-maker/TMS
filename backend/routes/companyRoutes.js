const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middleware/authMiddleware");
const controller = require("../../controllers/companyController");

const optionalAuth = (req, res, next) => {
    if (!req.headers.authorization) {
        return next();
    }

    return authMiddleware(req, res, next);
};

router.get("/", optionalAuth, controller.listCompanies);
router.get("/:id", authMiddleware, controller.getCompany);
router.post("/", authMiddleware, controller.createCompany);
router.put("/:id", authMiddleware, controller.updateCompany);
router.delete("/:id", authMiddleware, controller.deactivateCompany);

module.exports = router;
