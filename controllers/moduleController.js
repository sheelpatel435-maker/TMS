const db = require("../config/db");
const moduleModel = require("../models/moduleModel");
const { parsePagination } = require("../utils/pagination");
const { sendError, HttpError } = require("../utils/httpError");
const { isSuperAdmin } = require("../utils/roles");

const MODULE_RECORDS = {
    vehicles: {
        table: "vehicles",
        columns: "id, company_id, vehicle_type_id, registration_no, capacity, status, created_at, updated_at"
    },
    drivers: {
        table: "drivers",
        columns: "id, company_id, name, mobile, email, address, status, created_at, updated_at"
    },
    helpers: {
        table: "helpers",
        columns: "id, company_id, name, mobile, email, address, status, created_at, updated_at"
    },
    clients: {
        table: "clients",
        columns: "id, company_id, name, mobile, email, address, gst_number, status, created_at, updated_at"
    },
    bilties: {
        table: "bilties",
        columns: "id, company_id, bilty_number, client_id, status, trip_id, created_at, updated_at"
    },
    trips: {
        table: "trips",
        columns: "id, company_id, vehicle_id, driver_id, helper_id, bilty_id, client_id, source, destination, start_date, end_date, status, created_at, updated_at"
    },
    invoices: {
        table: "invoices",
        columns: "id, company_id, client_id, invoice_number, invoice_date, total_amount, balance_amount, status, created_at, updated_at"
    }
};

const getModules = async (req, res) => {
    try {
        const { rows: modules, pagination } = await moduleModel.getAllModules(
            parsePagination(req.query)
        );

        return res.status(200).json({
            success: true,
            modules,
            pagination
        });
    } catch (error) {
        return sendError(res, error);
    }
};

const getModuleRecords = async (req, res) => {
    try {
        const spec = MODULE_RECORDS[req.params.type];

        if (!spec) {
            throw new HttpError(404, "Module not found");
        }

        const params = [];
        let where = "";

        if (!isSuperAdmin(req.user)) {
            if (!req.user.company_id) {
                throw new HttpError(400, "User is not assigned to a company");
            }

            where = "WHERE company_id = ?";
            params.push(req.user.company_id);
        }

        const [records] = await db.execute(
            `SELECT ${spec.columns}
             FROM ${spec.table}
             ${where}
             ORDER BY id DESC
             LIMIT 100`,
            params
        );

        return res.status(200).json({
            success: true,
            records
        });
    } catch (error) {
        return sendError(res, error);
    }
};

module.exports = {
    getModules,
    getModuleRecords,
    MODULE_RECORDS
};
