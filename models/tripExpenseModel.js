const db = require("../config/db");
const { paginatedSelect } = require("../utils/pagination");
const { HttpError } = require("../utils/httpError");
const { assertTransition } = require("../utils/statusTransitions");
const { toNumber } = require("../utils/validation");

const createExpense = async (data) => {
    const [result] = await db.execute(
        `INSERT INTO trip_expenses
        (
            company_id,
            trip_id,
            expense_type,
            requested_amount,
            approved_amount,
            receipt_url,
            remarks,
            status
        )
        VALUES (?, ?, ?, ?, NULL, ?, ?, 'PENDING')`,
        [
            data.company_id,
            data.trip_id,
            data.expense_type,
            data.requested_amount,
            data.receipt_url,
            data.remarks
        ]
    );

    return result.insertId;
};

const getExpenses = async (companyId, pagination) => {
    return paginatedSelect(db, {
        table: "trip_expenses",
        columns: "*",
        where: "company_id = ?",
        params: [companyId],
        pagination
    });
};

const getExpenseById = async (id, companyId) => {
    const [rows] = await db.execute(
        `SELECT *
         FROM trip_expenses
         WHERE id = ? AND company_id = ?
         LIMIT 1`,
        [id, companyId]
    );

    return rows[0];
};

const updateStatus = async (id, companyId, status, approvedAmount) => {
    const expense = await getExpenseById(id, companyId);

    if (!expense) {
        throw new HttpError(404, "Trip expense not found");
    }

    assertTransition("expense", expense.status, status);

    let nextApproved = expense.approved_amount;

    if (status === "APPROVED") {
        nextApproved = approvedAmount == null
            ? toNumber(expense.requested_amount)
            : toNumber(approvedAmount);
    } else if (status === "REJECTED") {
        nextApproved = 0;
    }

    const [result] = await db.execute(
        `UPDATE trip_expenses
         SET status = ?,
             approved_amount = ?
         WHERE id = ? AND company_id = ?`,
        [
            status,
            nextApproved,
            id,
            companyId
        ]
    );

    return result.affectedRows;
};

module.exports = {
    createExpense,
    getExpenses,
    getExpenseById,
    updateStatus
};
