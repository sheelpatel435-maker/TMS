const driverModel = require("../models/driverModel");
const driverDocumentModel = require("../models/driverDocumentModel");
const { parsePagination } = require("../utils/pagination");
const { sendError, HttpError } = require("../utils/httpError");
const { isMissing } = require("../utils/validation");
const { resolveCompanyId } = require("../utils/companyScope");
const { writeAudit } = require("../utils/audit");
const { withTransaction } = require("../utils/transaction");
const { createStaffLoginUser } = require("../utils/staffAccount");
const { requireValidMobile } = require("../utils/userValidation");
const { resolveDutyUpdate } = require("../utils/crewWorkflow");

const requireCompany = (req) => resolveCompanyId(req);

const getDriverFilters = (query) => {
    const filters = {};

    if (query.search) {
        filters.search = String(query.search).trim();
    }

    if (query.status !== undefined && query.status !== "") {
        filters.status = query.status;
    }

    if (query.availability_status) {
        filters.availability_status = String(query.availability_status).trim();
    }

    return filters;
};

const getDrivers = async (req, res) => {
    try {
        const companyId = requireCompany(req);

        const { rows: drivers, pagination } = await driverModel.getDrivers(
            companyId,
            parsePagination(req.query),
            getDriverFilters(req.query)
        );

        return res.status(200).json({
            success: true,
            drivers,
            pagination
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const getDriverById = async (req, res) => {
    try {
        const companyId = requireCompany(req);
        const driver = await driverModel.getDriverById(req.params.id, companyId);

        if (!driver) {
            throw new HttpError(404, "Driver not found");
        }

        return res.status(200).json({
            success: true,
            driver
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const createDriver = async (req, res) => {
    try {
        const companyId = requireCompany(req);
        const { name, mobile, license_number, password } = req.body;

        if (isMissing(name) || isMissing(mobile)) {
            throw new HttpError(400, "Name and mobile are required");
        }

        if (isMissing(password)) {
            throw new HttpError(
                400,
                "Initial password is required for driver mobile login"
            );
        }

        const cleanMobile = requireValidMobile(mobile);

        const existing = await driverModel.findDriverByMobile(companyId, cleanMobile);
        if (existing) {
            throw new HttpError(409, "Driver with this mobile number already exists");
        }

        const { id, userId } = await withTransaction(async (connection) => {
            const login = await createStaffLoginUser({
                companyId,
                userType: "DRIVER",
                name,
                mobile: cleanMobile,
                email: req.body.email,
                password,
                connection
            });

            const driverId = await driverModel.createDriver(
                companyId,
                {
                    ...req.body,
                    mobile: cleanMobile,
                    user_id: login.userId,
                    availability_status: "AVAILABLE"
                },
                connection
            );

            return { id: driverId, userId: login.userId };
        });

        await writeAudit(req, "DRIVER_CREATED", "driver", id);

        // Admin-created docs are trusted — no separate verification step
        if (!isMissing(license_number)) {
            await driverDocumentModel.createDriverDocument(companyId, id, {
                document_type: "LICENSE",
                document_number: license_number,
                status: 1
            });
        }

        return res.status(201).json({
            success: true,
            message: "Driver created successfully with mobile login",
            id,
            user_id: userId
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const updateDriver = async (req, res) => {
    try {
        const companyId = requireCompany(req);
        const existing = await driverModel.getDriverById(req.params.id, companyId);

        if (!existing) {
            throw new HttpError(404, "Driver not found");
        }

        const name = req.body.name ?? existing.name;
        const mobile = req.body.mobile ?? existing.mobile;

        if (isMissing(name) || isMissing(mobile)) {
            throw new HttpError(400, "Name and mobile are required");
        }

        const cleanMobile = requireValidMobile(mobile);
        const duplicate = await driverModel.findDriverByMobile(
            companyId,
            cleanMobile,
            req.params.id
        );
        if (duplicate) {
            throw new HttpError(409, "Driver with this mobile number already exists");
        }

        const updated = await driverModel.updateDriver(req.params.id, companyId, {
            name,
            mobile: cleanMobile,
            email: req.body.email !== undefined ? req.body.email : existing.email,
            address:
                req.body.address !== undefined ? req.body.address : existing.address,
            status: req.body.status !== undefined ? req.body.status : existing.status,
            availability_status:
                req.body.availability_status !== undefined
                    ? req.body.availability_status
                    : existing.availability_status
        });

        if (!updated) {
            throw new HttpError(404, "Driver not found");
        }

        await writeAudit(req, "DRIVER_UPDATED", "driver", req.params.id);

        return res.status(200).json({
            success: true,
            message: "Driver updated successfully"
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const deactivateDriver = async (req, res) => {
    try {
        const companyId = requireCompany(req);
        const existing = await driverModel.getDriverById(req.params.id, companyId);

        if (!existing) {
            throw new HttpError(404, "Driver not found");
        }

        if (existing.availability_status === "ON_TRIP") {
            throw new HttpError(400, "Cannot deactivate driver who is on a trip");
        }

        const updated = await driverModel.deactivateDriver(req.params.id, companyId);

        if (!updated) {
            throw new HttpError(404, "Driver not found");
        }

        await writeAudit(req, "DRIVER_DEACTIVATED", "driver", req.params.id);

        return res.status(200).json({
            success: true,
            message: "Driver deactivated successfully"
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const setDriverDuty = async (req, res) => {
    try {
        const companyId = requireCompany(req);
        const existing = await driverModel.getDriverById(req.params.id, companyId);

        if (!existing) {
            throw new HttpError(404, "Driver not found");
        }

        if (existing.availability_status === "ON_TRIP") {
            throw new HttpError(
                400,
                "Cannot change duty while driver is on a trip"
            );
        }

        const dutyUpdate = resolveDutyUpdate(req.body.duty || req.body.duty_status);
        const updated = await driverModel.setDutyStatus(
            req.params.id,
            companyId,
            dutyUpdate
        );

        if (!updated) {
            throw new HttpError(404, "Driver not found");
        }

        await writeAudit(
            req,
            "DRIVER_DUTY_UPDATED",
            "driver",
            req.params.id,
            `duty=${String(req.body.duty || req.body.duty_status || "").toUpperCase()}`
        );

        return res.status(200).json({
            success: true,
            message: "Driver duty updated successfully",
            status: dutyUpdate.status,
            availability_status: dutyUpdate.availability_status
        });
    } catch (error) {
        return sendError(res, error);
    }
};

module.exports = {
    getDrivers,
    getDriverById,
    createDriver,
    updateDriver,
    deactivateDriver,
    setDriverDuty
};
