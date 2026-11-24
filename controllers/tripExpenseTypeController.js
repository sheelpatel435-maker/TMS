const tripExpenseTypeModel = require("../models/tripExpenseTypeModel");
const { sendError, HttpError } = require("../utils/httpError");
const { isMissing } = require("../utils/validation");
const { resolveCompanyId } = require("../utils/companyScope");
const { writeAudit } = require("../utils/audit");

const getExpenseTypes = async (req, res) => {
    try {
        const types = await tripExpenseTypeModel.listTypes(resolveCompanyId(req));
        return res.status(200).json({ success: true, expenseTypes: types });
    } catch (error) {
        return sendError(res, error);
    }
};

const createExpenseType = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const { name, code } = req.body || {};
        if (isMissing(name)) throw new HttpError(400, "name is required");

        try {
            const id = await tripExpenseTypeModel.createType(companyId, { name, code });
            await writeAudit(req, "TRIP_EXPENSE_TYPE_CREATED", "trip_expense_type", id);
            return res.status(201).json({
                success: true,
                message: "Expense type created",
                id
            });
        } catch (err) {
            if (String(err.message || "").includes("Duplicate")) {
                throw new HttpError(409, "Expense type already exists");
            }
            throw new HttpError(400, err.message || "Invalid expense type");
        }
    } catch (error) {
        return sendError(res, error);
    }
};

const deactivateExpenseType = async (req, res) => {
    try {
        const companyId = resolveCompanyId(req);
        const updated = await tripExpenseTypeModel.deactivateType(
            req.params.id,
            companyId
        );
        if (!updated) throw new HttpError(404, "Expense type not found");
        await writeAudit(
            req,
            "TRIP_EXPENSE_TYPE_DEACTIVATED",
            "trip_expense_type",
            req.params.id
        );
        return res.status(200).json({
            success: true,
            message: "Expense type deactivated"
        });
    } catch (error) {
        return sendError(res, error);
    }
};

module.exports = {
    getExpenseTypes,
    createExpenseType,
    deactivateExpenseType
};
