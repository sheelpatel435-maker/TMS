const db = require("../config/db");

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
        VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
        [
            data.company_id,
            data.trip_id,
            data.expense_type,
            data.requested_amount,
            data.approved_amount,
            data.receipt_url,
            data.remarks
        ]
    );

    return result.insertId;
};

const getExpenses = async (companyId) => {
    const [rows] = await db.execute(
        `SELECT *
         FROM trip_expenses
         WHERE company_id = ?
         ORDER BY id DESC`,
        [companyId]
    );

    return rows;
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

const updateStatus = async (
    id,
    companyId,
    status,
    approvedAmount
) => {
    const [result] = await db.execute(
        `UPDATE trip_expenses
         SET status = ?,
             approved_amount = ?
         WHERE id = ? AND company_id = ?`,
        [
            status,
            approvedAmount,
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
