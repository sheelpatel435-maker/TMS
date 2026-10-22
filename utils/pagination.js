const parsePagination = (query = {}) => {
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
    let page = Math.max(1, parseInt(query.page, 10) || 1);
    let offset;

    if (query.offset !== undefined && query.offset !== "") {
        offset = Math.max(0, parseInt(query.offset, 10) || 0);
        page = Math.floor(offset / limit) + 1;
    } else {
        offset = (page - 1) * limit;
    }

    return { page, limit, offset };
};

const buildMeta = (page, limit, total) => ({
    page,
    limit,
    offset: (page - 1) * limit,
    total,
    totalPages: Math.ceil(total / limit) || 0
});

const paginatedSelect = async (
    db,
    {
        table,
        columns = "*",
        where = "",
        params = [],
        orderBy = "id DESC",
        pagination
    }
) => {
    const { page, limit, offset } = pagination;
    const whereSql = where ? `WHERE ${where}` : "";

    const [countRows] = await db.query(
        `SELECT COUNT(*) AS total FROM ${table} ${whereSql}`,
        params
    );

    const total = Number(countRows[0]?.total || 0);

    const [rows] = await db.query(
        `SELECT ${columns}
         FROM ${table}
         ${whereSql}
         ORDER BY ${orderBy}
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
    );

    return {
        rows,
        pagination: buildMeta(page, limit, total)
    };
};

module.exports = {
    parsePagination,
    buildMeta,
    paginatedSelect
};
