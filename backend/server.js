const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const db = require("../config/db");
const { ensureSchema } = require("../config/schema");
const moduleRoutes = require("./routes/moduleRoutes");
const userModuleAccessRoutes = require("./routes/userModuleAccessRoutes");
const vehicleTypeRoutes = require("./routes/vehicleTypeRoutes");
const vehicleRoutes = require("./routes/vehicleRoutes");
const vehicleDocumentRoutes = require("./routes/vehicleDocumentRoutes");
const driverRoutes = require("./routes/driverRoutes");
const driverDocumentRoutes = require("./routes/driverDocumentRoutes");
const helperRoutes = require("./routes/helperRoutes");
const helperDocumentRoutes = require("./routes/helperDocumentRoutes");
const clientRoutes = require("./routes/clientRoutes");
const authRoutes = require("./routes/authRoutes");
const companyRoutes = require("./routes/companyRoutes");
const userRoutes = require("./routes/userRoutes");
const biltyRoutes = require("./routes/biltyRoutes");
const tripRoutes = require("./routes/tripRoutes");
const tripAdvanceRoutes = require("./routes/tripAdvanceRoutes");
const tripExpenseRoutes = require("./routes/tripExpenseRoutes");
const tripFinalReportRoutes = require("./routes/tripFinalReportRoutes");
const tripSettlementRoutes = require("./routes/tripSettlementRoutes");
const tripDocumentRoutes = require("./routes/tripDocumentRoutes");
const vehicleAssignmentRoutes = require("./routes/vehicleAssignmentRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
const invoicePaymentRoutes = require("./routes/invoicePaymentRoutes");
const invoicePaymentDeductionRoutes = require("./routes/invoicePaymentDeductionRoutes");
const reportRoutes = require("./routes/reportRoutes");
const auditLogRoutes = require("./routes/auditLogRoutes");
const documentExpiryRoutes = require("./routes/documentExpiryRoutes");
const mobileRoutes = require("./routes/mobileRoutes");
const authController = require("../controllers/authController");
const dashboardController = require("../controllers/dashboardController");
const fileController = require("../controllers/fileController");
const authMiddleware = require("../middleware/authMiddleware");
const rejectMobileDeskAccess = require("../middleware/rejectMobileDeskAccess");
const accessLog = require("../middleware/accessLog");
const swaggerUi = require("swagger-ui-express");
const openapi = require("./openapi");

const app = express();

app.set("trust proxy", 1);

const corsOrigins = Array.from(
    new Set(
        [
            ...(process.env.CORS_ORIGIN || "").split(","),
            "http://localhost:5000",
            "http://localhost:5173",
            "https://tms-ui-pi.vercel.app"
        ]
            .map((origin) => origin.trim())
            .filter(Boolean)
    )
);

app.use(
    helmet({
        contentSecurityPolicy: false,
        crossOriginResourcePolicy: { policy: "cross-origin" }
    })
);

app.use((req, res, next) => {
    if (process.env.NODE_ENV !== "production") {
        return next();
    }

    const secure = req.secure || req.headers["x-forwarded-proto"] === "https";

    if (secure) {
        return next();
    }

    return res.status(403).json({
        success: false,
        message: "HTTPS is required"
    });
});

app.use(
    cors({
        origin: corsOrigins,
        credentials: true
    })
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(accessLog);

const swaggerSpec = (req) => {
    const proto = req.headers["x-forwarded-proto"] || req.protocol;
    return {
        ...openapi,
        servers: [{ url: `${proto}://${req.get("host")}`, description: "This server" }]
    };
};

app.get("/api-docs.json", (req, res) => {
    res.json(swaggerSpec(req));
});
app.use("/api-docs", swaggerUi.serve, (req, res, next) => {
    swaggerUi.setup(swaggerSpec(req), {
        customSiteTitle: "TMS API",
        swaggerOptions: { persistAuthorization: true }
    })(req, res, next);
});

app.get("/api/health", async (_req, res) => {
    try {
        await db.query("SELECT 1");
        return res.status(200).json({
            success: true,
            message: "TMS API healthy",
            db: true
        });
    } catch (error) {
        return res.status(503).json({
            success: false,
            message: "Database unavailable",
            db: false
        });
    }
});

app.get("/api", (_req, res) => {
    res.status(200).json({
        success: true,
        message: "TMS API is working"
    });
});

app.get("/api/files/:filename", authMiddleware, fileController.downloadFile);

app.use("/api/auth", authRoutes);
app.use("/api/mobile", mobileRoutes);

const deskOnly = [authMiddleware, rejectMobileDeskAccess];

app.use("/api/modules", ...deskOnly, moduleRoutes);
app.use("/api/user-module-access", ...deskOnly, userModuleAccessRoutes);
app.use("/api/vehicle-types", ...deskOnly, vehicleTypeRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/vehicle-documents", ...deskOnly, vehicleDocumentRoutes);
app.use("/api/drivers", ...deskOnly, driverRoutes);
app.use("/api/driver-documents", ...deskOnly, driverDocumentRoutes);
app.use("/api/helpers", ...deskOnly, helperRoutes);
app.use("/api/helper-documents", ...deskOnly, helperDocumentRoutes);
app.use("/api/vehicle-assignments", ...deskOnly, vehicleAssignmentRoutes);
app.use("/api/clients", ...deskOnly, clientRoutes);
app.use("/api/companies", ...deskOnly, companyRoutes);
app.use("/api/users", ...deskOnly, userRoutes);
app.post("/api/register", (_req, res) =>
    res.status(410).json({
        success: false,
        message: "Ye endpoint band hai. Admin panel se user banaye jaate hain."
    })
);
app.post("/api/login", authController.login);
app.post("/api/refresh", authController.refresh);
app.post("/api/logout", authMiddleware, authController.logout);
app.get("/api/profile", authMiddleware, authController.profile);
app.get(
    "/api/dashboard",
    authMiddleware,
    rejectMobileDeskAccess,
    dashboardController.getDashboard
);
app.use("/api/bilties", ...deskOnly, biltyRoutes);
app.use("/api/trips", ...deskOnly, tripRoutes);
app.use("/api/trip-advances", ...deskOnly, tripAdvanceRoutes);
app.use("/api/trip-expenses", ...deskOnly, tripExpenseRoutes);
app.use("/api/trip-final-reports", ...deskOnly, tripFinalReportRoutes);
app.use("/api/trip-settlements", ...deskOnly, tripSettlementRoutes);
app.use("/api/trip-documents", ...deskOnly, tripDocumentRoutes);
app.use("/api/invoices", ...deskOnly, invoiceRoutes);
app.use("/api/invoice-payments", ...deskOnly, invoicePaymentRoutes);
app.use(
    "/api/invoice-payment-deductions",
    ...deskOnly,
    invoicePaymentDeductionRoutes
);
app.use("/api/reports", ...deskOnly, reportRoutes);
app.use("/api/audit-logs", ...deskOnly, auditLogRoutes);
app.use("/api/documents", ...deskOnly, documentExpiryRoutes);

app.use(express.static(path.join(__dirname, "public")));

app.get("/{*path}", (req, res, next) => {
    if (
        req.path.startsWith("/api") ||
        req.path.startsWith("/api-docs")
    ) {
        return next();
    }

    if (path.extname(req.path)) {
        return next();
    }

    return res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.use((error, _req, res, _next) => {
    const status = error.status || error.statusCode || 500;
    return res.status(status).json({
        success: false,
        message: error.message || "Request failed"
    });
});

const PORT = process.env.PORT || 5000;

const start = async () => {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
        throw new Error("JWT_SECRET must be set in env and be at least 32 characters");
    }

    await ensureSchema();

    app.listen(PORT, () => {
        console.log(`TMS Server running on http://localhost:${PORT}`);
        console.log(`Swagger docs on http://localhost:${PORT}/api-docs`);
    });
};

start().catch((error) => {
    console.error("Failed to start TMS server", error);
    process.exit(1);
});
