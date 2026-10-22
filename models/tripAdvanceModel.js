const db = require("../config/db");
const { paginatedSelect } = require("../utils/pagination");
const { HttpError } = require("../utils/httpError");
const { assertTransition } = require("../utils/statusTransitions");

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

const getAdvances = async (companyId, pagination) => {
    return paginatedSelect(db, {
        table: "trip_advances",
        columns: "*",
        where: "company_id = ?",
        params: [companyId],
        pagination
    });
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
    const advance = await getAdvanceById(id, companyId);

    if (!advance) {
        throw new HttpError(404, "Trip advance not found");
    }

    assertTransition("advance", advance.status, status);

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
