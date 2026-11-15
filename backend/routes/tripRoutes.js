const express = require("express");
const router = express.Router();

const controller = require("../../controllers/tripController");
const authMiddleware = require("../../middleware/authMiddleware");
const requireModule = require("../../middleware/requireModule");

router.use(authMiddleware);

router.get("/", requireModule("Trips", "can_view"), controller.getTrips);
router.post("/", requireModule("Trips", "can_create"), controller.createTrip);
router.get("/:id/route", requireModule("Trips", "can_view"), controller.getTripRoute);
router.post("/:id/stops", requireModule("Trips", "can_update"), controller.saveTripRoute);
router.patch(
    "/:id/status",
    requireModule("Trips", (req) => {
        const status = String(req.body?.status || "").toUpperCase();
        if (status === "DISPATCHED") return "can_dispatch";
        if (status === "CLOSED") return "can_close";
        return "can_approve";
    }),
    controller.updateTripStatus
);
router.get("/:id", requireModule("Trips", "can_view"), controller.getTripById);
router.put("/:id", requireModule("Trips", "can_update"), controller.updateTrip);
router.delete("/:id", requireModule("Trips", "can_delete"), controller.deactivateTrip);

module.exports = router;
