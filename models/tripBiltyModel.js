const db = require("../config/db");

const listByTrip = async (companyId, tripId, executor = db) => {
    const [rows] = await executor.execute(
        `SELECT tb.id, tb.company_id, tb.trip_id, tb.bilty_id, tb.sort_order, tb.status,
                b.bilty_number, b.status AS bilty_status, b.consignor, b.consignee,
                b.pickup_location, b.drop_location, b.weight_kg, b.packages
         FROM trip_bilties tb
         INNER JOIN bilties b
           ON b.id = tb.bilty_id AND b.company_id = tb.company_id
         WHERE tb.company_id = ? AND tb.trip_id = ? AND tb.status = 1
         ORDER BY tb.sort_order ASC, tb.id ASC`,
        [companyId, tripId]
    );
    return rows;
};

const replaceForTrip = async (companyId, tripId, biltyIds, executor = db) => {
    const ids = [...new Set((biltyIds || []).map((id) => Number(id)).filter(Boolean))];

    await executor.execute(
        `UPDATE trip_bilties
         SET status = 0
         WHERE company_id = ? AND trip_id = ? AND status = 1`,
        [companyId, tripId]
    );

    let sort = 0;
    for (const biltyId of ids) {
        await executor.execute(
            `INSERT INTO trip_bilties (company_id, trip_id, bilty_id, sort_order, status)
             VALUES (?, ?, ?, ?, 1)
             ON DUPLICATE KEY UPDATE status = 1, sort_order = VALUES(sort_order)`,
            [companyId, tripId, biltyId, sort]
        );
        await executor.execute(
            `UPDATE bilties
             SET trip_id = ?
             WHERE id = ? AND company_id = ?`,
            [tripId, biltyId, companyId]
        );
        sort += 1;
    }

    return listByTrip(companyId, tripId, executor);
};

const primaryBiltyId = (biltyIds) => {
    const ids = [...new Set((biltyIds || []).map((id) => Number(id)).filter(Boolean))];
    return ids[0] || null;
};

module.exports = {
    listByTrip,
    replaceForTrip,
    primaryBiltyId
};
