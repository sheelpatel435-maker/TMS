const db = require("../config/db");

const dateWhere = (column, from, to, extra = []) => {
    const where = [...extra];
    const params = [];

    if (from) {
        where.push(`${column} >= ?`);
        params.push(from);
    }

    if (to) {
        where.push(`${column} <= ?`);
        params.push(to);
    }

    return {
        sql: where.length ? `WHERE ${where.join(" AND ")}` : "",
        params
    };
};

const getTripCounts = async (companyId, from, to) => {
    const { sql, params } = dateWhere("start_date", from, to, ["company_id = ?"]);
    const [rows] = await db.execute(
        `SELECT status, COUNT(*) AS count
         FROM trips
         ${sql}
         GROUP BY status`,
        [companyId, ...params]
    );

    const counts = {
        CREATED: 0,
        DISPATCHED: 0,
        IN_TRANSIT: 0,
        DELIVERED: 0,
        COMPLETED: 0,
        CANCELLED: 0,
        total: 0
    };

    rows.forEach((row) => {
        counts[row.status] = Number(row.count);
        counts.total += Number(row.count);
    });

    return counts;
};

const getFinanceSummary = async (companyId, from, to) => {
    const { sql, params } = dateWhere("invoice_date", from, to, [
        "company_id = ?",
        "status <> 'CANCELLED'"
    ]);

    const [rows] = await db.execute(
        `SELECT
            COALESCE(SUM(total_amount), 0) AS invoiced,
            COALESCE(SUM(total_amount - balance_amount), 0) AS received,
            COALESCE(SUM(balance_amount), 0) AS outstanding
         FROM invoices
         ${sql}`,
        [companyId, ...params]
    );

    return rows[0];
};

const getTripDetail = async (companyId, tripId) => {
    const [tripRows] = await db.execute(
        `SELECT *
         FROM trips
         WHERE id = ? AND company_id = ?
         LIMIT 1`,
        [tripId, companyId]
    );

    if (!tripRows[0]) {
        return null;
    }

    const [advances] = await db.execute(
        `SELECT id, amount, payment_date, payment_method, reference_no, status
         FROM trip_advances
         WHERE trip_id = ? AND company_id = ?
         ORDER BY id ASC`,
        [tripId, companyId]
    );

    const [expenses] = await db.execute(
        `SELECT id, expense_type, requested_amount, approved_amount, remarks, status
         FROM trip_expenses
         WHERE trip_id = ? AND company_id = ?
         ORDER BY id ASC`,
        [tripId, companyId]
    );

    const [settlements] = await db.execute(
        `SELECT *
         FROM trip_settlements
         WHERE trip_id = ? AND company_id = ?
         ORDER BY id DESC`,
        [tripId, companyId]
    );

    const [advanceSum] = await db.execute(
        `SELECT COALESCE(SUM(amount), 0) AS total
         FROM trip_advances
         WHERE trip_id = ? AND company_id = ? AND status IN ('APPROVED','PAID')`,
        [tripId, companyId]
    );

    const [expenseSum] = await db.execute(
        `SELECT COALESCE(SUM(COALESCE(approved_amount, requested_amount)), 0) AS total
         FROM trip_expenses
         WHERE trip_id = ? AND company_id = ? AND status = 'APPROVED'`,
        [tripId, companyId]
    );

    return {
        trip: tripRows[0],
        advances,
        expenses,
        settlement: settlements[0] || null,
        totals: {
            advance: Number(advanceSum[0].total),
            expenses: Number(expenseSum[0].total),
            balance: Number(advanceSum[0].total) - Number(expenseSum[0].total)
        }
    };
};

module.exports = {
    getTripCounts,
    getFinanceSummary,
    getTripDetail
};
