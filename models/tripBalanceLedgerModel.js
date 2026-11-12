const db = require("../config/db");
const { paginatedSelect } = require("../utils/pagination");
const { roundMoney } = require("../utils/validation");

const getLatestBalance = async (companyId, driverId, connection = null) => {
    const executor = connection || db;
    const [rows] = await executor.execute(
        `SELECT balance_after
         FROM trip_balance_ledger
         WHERE company_id = ?
           AND driver_id = ?
         ORDER BY id DESC
         LIMIT 1`,
        [companyId, driverId]
    );

    return rows[0] ? roundMoney(rows[0].balance_after) : 0;
};

const createEntry = async (data, connection = null) => {
    const executor = connection || db;
    const previous = await getLatestBalance(
        data.company_id,
        data.driver_id,
        executor
    );
    const amount = roundMoney(data.amount);
    const signed =
        data.entry_type === "DEBIT" ? -Math.abs(amount) : Math.abs(amount);
    const balanceAfter = roundMoney(previous + signed);

    const [result] = await executor.execute(
        `INSERT INTO trip_balance_ledger
        (
            company_id,
            trip_id,
            driver_id,
            settlement_id,
            entry_type,
            amount,
            balance_after,
            reference_trip_id,
            remarks,
            created_by
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            data.company_id,
            data.trip_id,
            data.driver_id || null,
            data.settlement_id || null,
            data.entry_type,
            Math.abs(amount),
            balanceAfter,
            data.reference_trip_id || null,
            data.remarks || null,
            data.created_by || null
        ]
    );

    return { id: result.insertId, balance_after: balanceAfter };
};

const listByDriver = async (companyId, driverId, pagination) =>
    paginatedSelect(db, {
        table: "trip_balance_ledger",
        columns: "*",
        where: "company_id = ? AND driver_id = ?",
        params: [companyId, driverId],
        pagination
    });

module.exports = {
    getLatestBalance,
    createEntry,
    listByDriver
};
