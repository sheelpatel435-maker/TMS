const { toTinyIntStatus } = require("./validation");

const parseListFilters = (query = {}) => {
    const filters = {};

    if (query.search) {
        filters.search = String(query.search).trim();
    }

    if (query.status !== undefined && query.status !== "") {
        filters.status = query.status;
    }

    if (query.from) {
        filters.from = query.from;
    }

    if (query.to) {
        filters.to = query.to;
    }

    if (query.overdue === "1" || query.overdue === "true") {
        filters.overdue = true;
    }

    return filters;
};

const likeTerm = (value) =>
    `%${String(value).replace(/[%_]/g, "\\$&")}%`;

const buildListWhere = ({
    companyId,
    filters = {},
    searchColumns = [],
    statusColumn = "status",
    dateColumn = "start_date",
    numericStatus = false
} = {}) => {
    const where = [];
    const params = [];

    if (companyId != null && companyId !== "") {
        where.push("company_id = ?");
        params.push(companyId);
    }

    if (filters.status !== undefined && filters.status !== "") {
        where.push(`${statusColumn} = ?`);
        params.push(
            numericStatus ? toTinyIntStatus(filters.status, 1) : filters.status
        );
    }

    if (filters.search && searchColumns.length) {
        where.push(
            `(${searchColumns.map((column) => `${column} LIKE ?`).join(" OR ")})`
        );
        const term = likeTerm(filters.search);
        searchColumns.forEach(() => params.push(term));
    }

    if (filters.from) {
        where.push(`${dateColumn} >= ?`);
        params.push(filters.from);
    }

    if (filters.to) {
        where.push(`${dateColumn} <= ?`);
        params.push(filters.to);
    }

    return {
        where: where.join(" AND "),
        params
    };
};

module.exports = {
    parseListFilters,
    buildListWhere
};
