const db = require("../config/db");
const { paginatedSelect } = require("../utils/pagination");
const { HttpError } = require("../utils/httpError");
const { assertTransition } = require("../utils/statusTransitions");
const { roundMoney } = require("../utils/validation");

const computeTotals = async (companyId, tripId) => {
    const [advanceRows] = await db.execute(
        `SELECT COALESCE(SUM(amount), 0) AS total_advance
         FROM trip_advances
         WHERE company_id = ?
         AND trip_id = ?
         AND status IN ('APPROVED', 'PAID')`,
        [companyId, tripId]
    );

    const [expenseRows] = await db.execute(
        `SELECT COALESCE(SUM(approved_amount), 0) AS total_expenses
         FROM trip_expenses
         WHERE company_id = ?
         AND trip_id = ?
         AND status = 'APPROVED'`,
        [companyId, tripId]
    );

    const totalAdvance = roundMoney(advanceRows[0].total_advance);
    const totalExpenses = roundMoney(expenseRows[0].total_expenses);
    const balanceAmount = roundMoney(totalAdvance - totalExpenses);

    return {
        total_advance: totalAdvance,
        total_expenses: totalExpenses,
        final_amount: totalExpenses,
        balance_amount: balanceAmount
    };
};

const createSettlement = async (data) => {
    const totals = await computeTotals(data.company_id, data.trip_id);
    const status = ["CARRY_FORWARD", "CARRIED_FORWARD"].includes(data.settlement_type)
        ? "CARRY_FORWARD"
        : "PENDING";

    const [result] = await db.execute(
        `INSERT INTO trip_settlements
        (
            company_id,
            trip_id,
            total_advance,
            total_expenses,
            final_amount,
            balance_amount,
            status,
            remarks
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            data.company_id,
            data.trip_id,
            totals.total_advance,
            totals.total_expenses,
            totals.final_amount,
            totals.balance_amount,
            status,
            data.remarks || data.settlement_no || null
        ]
    );

    return result.insertId;
};

const getSettlements = async (companyId, pagination) => {
    return paginatedSelect(db, {
        table: "trip_settlements",
        columns: "*",
        where: "company_id = ?",
        params: [companyId],
        pagination
    });
};

const getSettlementById = async (id, companyId) => {
    const [rows] = await db.execute(
        `SELECT *
         FROM trip_settlements
         WHERE id = ? AND company_id = ?
         LIMIT 1`,
        [id, companyId]
    );

    return rows[0];
};

const mapIncomingStatus = (status) => {
    const aliases = {
        PENDING_APPROVAL: "PENDING",
        APPROVED: "SETTLED",
        PAID: "SETTLED",
        CLOSED: "SETTLED",
        CARRIED_FORWARD: "CARRY_FORWARD"
    };

    return aliases[status] || status;
};

const updateStatus = async (id, companyId, status) => {
    const settlement = await getSettlementById(id, companyId);

    if (!settlement) {
        throw new HttpError(404, "Settlement not found");
    }

    const nextStatus = mapIncomingStatus(status);

    assertTransition("settlement", settlement.status, nextStatus);

    const settledAtSql = nextStatus === "SETTLED"
        ? "CURRENT_TIMESTAMP"
        : "settled_at";

    const [result] = await db.query(
        `UPDATE trip_settlements
         SET status = ?,
             settled_at = ${settledAtSql}
         WHERE id = ? AND company_id = ?`,
        [nextStatus, id, companyId]
    );

    return result.affectedRows;
};

module.exports = {
    computeTotals,
    createSettlement,
    getSettlements,
    getSettlementById,
    updateStatus
};
