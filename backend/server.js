const express = require("express");
const cors = require("cors");
const path = require("path");
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
const biltyRoutes = require("./routes/biltyRoutes");
const tripRoutes = require("./routes/tripRoutes");
const tripAdvanceRoutes = require("./routes/tripAdvanceRoutes");
const tripExpenseRoutes = require("./routes/tripExpenseRoutes");
const tripFinalReportRoutes = require("./routes/tripFinalReportRoutes");
const tripSettlementRoutes = require("./routes/tripSettlementRoutes");
const vehicleAssignmentRoutes = require("./routes/vehicleAssignmentRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
const invoicePaymentRoutes = require("./routes/invoicePaymentRoutes");  
const invoicePaymentDeductionRoutes = require("./routes/invoicePaymentDeductionRoutes");

require("dotenv").config();



const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api/modules", moduleRoutes);
app.use("/api/user-module-access", userModuleAccessRoutes);
app.use("/api/vehicle-types", vehicleTypeRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/vehicle-documents", vehicleDocumentRoutes);
app.use("/api/drivers", driverRoutes);
app.use("/api/driver-documents", driverDocumentRoutes);
app.use("/api/helpers", helperRoutes);
app.use("/api/helper-documents", helperDocumentRoutes);
app.use("/api/vehicle-assignments", vehicleAssignmentRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/bilties", biltyRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/trip-advances", tripAdvanceRoutes);
app.use("/api/trip-expenses", tripExpenseRoutes);
app.use("/api/trip-final-reports", tripFinalReportRoutes);
app.use("/api/trip-settlements", tripSettlementRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/invoice-payments", invoicePaymentRoutes);
app.use("/api/invoice-payment-deductions",invoicePaymentDeductionRoutes);



app.use(express.static(path.join(__dirname, "public")));


app.get("/api", (req, res) => {
    res.status(200).json({
        success: true,
        message: "TMS API is working"
    });
});



const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`TMS Server running on http://localhost:${PORT}`);
});