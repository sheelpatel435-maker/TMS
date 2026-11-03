const express = require("express");
const router = express.Router();

const moduleController = require("../../controllers/moduleController");
const authMiddleware = require("../../middleware/authMiddleware");
const requireModule = require("../../middleware/requireModule");
const { requireAdmin } = require("../../utils/roles");

const MODULE_NAMES = {
    vehicles: "Vehicles",
    drivers: "Drivers",
    helpers: "Helpers",
    clients: "Clients",
    bilties: "Bilty",
    trips: "Trips",
    invoices: "Invoices"
};

router.get(
    "/",
    authMiddleware,
    requireAdmin,
    moduleController.getModules
);

router.get("/:type", authMiddleware, (req, res, next) => {
    const moduleName = MODULE_NAMES[req.params.type];

    if (!moduleName) {
        return res.status(404).json({
            success: false,
            message: "Module not found"
        });
    }

    return requireModule(moduleName, "can_view")(req, res, () =>
        moduleController.getModuleRecords(req, res)
    );
});

module.exports = router;
