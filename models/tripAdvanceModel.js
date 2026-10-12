const db = require("../config/db");

const createAdvance = async (data) => {
    const [result] = await db.execute(
        `INSERT INTO trip_advances
        (
            company_id,
            trip_id,
            amount,
            payment_date,
            payment_method,
            reference_no,
            status
        )
        VALUES (?, ?, ?, ?, ?, ?, 'PENDING')`,
        [
            data.company_id,
            data.trip_id,
            data.amount,
            data.payment_date,
            data.payment_method,
            data.reference_no
        ]
    );

    return result.insertId;
};

const getAdvances = async (companyId) => {
    const [rows] = await db.execute(
        `SELECT *
         FROM trip_advances
         WHERE company_id = ?
         ORDER BY id DESC`,
        [companyId]
    );

    return rows;
};

const getAdvanceById = async (id, companyId) => {
    const [rows] = await db.execute(
        `SELECT *
         FROM trip_advances
         WHERE id = ? AND company_id = ?
         LIMIT 1`,
        [id, companyId]
    );

    return rows[0];
};

const updateStatus = async (id, companyId, status) => {
    const [result] = await db.execute(
        `UPDATE trip_advances
         SET status = ?
         WHERE id = ? AND company_id = ?`,
        [status, id, companyId]
    );

    return result.affectedRows;
};

module.exports = {
    createAdvance,
    getAdvances,
    getAdvanceById,
    updateStatus
};
