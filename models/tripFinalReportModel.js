const db = require("../config/db");
const { paginatedSelect } = require("../utils/pagination");
const { HttpError } = require("../utils/httpError");
const { assertTransition } = require("../utils/statusTransitions");

const createReport = async (data) => {
    const [result] = await db.execute(
        `INSERT INTO trip_final_reports
        (
            company_id,
            trip_id,
            report_no,
            final_odometer_start,
            final_odometer_end,
            total_distance_km,
            loading_date,
            unloading_date,
            remarks,
            submitted_by,
            status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SUBMITTED')`,
        [
            data.company_id,
            data.trip_id,
            data.report_no,
            data.final_odometer_start,
            data.final_odometer_end,
            data.total_distance_km,
            data.loading_date,
            data.unloading_date,
            data.remarks,
            data.submitted_by
        ]
    );

    return result.insertId;
};

const getReports = async (companyId, pagination) => {
    return paginatedSelect(db, {
        table: "trip_final_reports",
        columns: "*",
        where: "company_id = ?",
        params: [companyId],
        pagination
    });
};

const getReportById = async (id, companyId) => {
    const [rows] = await db.execute(
        `SELECT *
         FROM trip_final_reports
         WHERE id = ? AND company_id = ?
         LIMIT 1`,
        [id, companyId]
    );

    return rows[0];
};

const updateStatus = async (id, companyId, status, verifiedBy) => {
    const report = await getReportById(id, companyId);

    if (!report) {
        throw new HttpError(404, "Final report not found");
    }

    assertTransition("finalReport", report.status, status);

    const [result] = await db.execute(
        `UPDATE trip_final_reports
         SET status = ?,
             verified_by = ?,
             verified_at = CURRENT_TIMESTAMP
         WHERE id = ? AND company_id = ?`,
        [status, verifiedBy, id, companyId]
    );

    return result.affectedRows;
};

module.exports = {
    createReport,
    getReports,
    getReportById,
    updateStatus
};
