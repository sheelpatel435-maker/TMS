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

const requireCompany = (req) => resolveCompanyId(req);

const getDriverFilters = (query) => {
    const filters = {};

    if (query.search) {
        filters.search = String(query.search).trim();
    }

    if (query.status !== undefined && query.status !== "") {
        filters.status = query.status;
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
                    user_id: login.userId
                },
                connection
            );

            return { id: driverId, userId: login.userId };
        });

        await writeAudit(req, "DRIVER_CREATED", "driver", id);

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
        const { name, mobile } = req.body;

        if (isMissing(name) || isMissing(mobile)) {
            throw new HttpError(400, "Name and mobile are required");
        }

        const updated = await driverModel.updateDriver(
            req.params.id,
            companyId,
            {
                ...req.body,
                mobile: requireValidMobile(mobile)
            }
        );

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

module.exports = {
    getDrivers,
    getDriverById,
    createDriver,
    updateDriver,
    deactivateDriver
};
