const moduleNames = {
    vehicles: "Vehicles",
    drivers: "Drivers",
    helpers: "Helpers",
    clients: "Clients",
    bilties: "Bilties",
    trips: "Trips",
    invoices: "Invoices"
};

const urlParams =
    new URLSearchParams(
        window.location.search
    );

const moduleName =
    urlParams.get("type");

const moduleTitle =
    document.getElementById(
        "moduleTitle"
    );

const moduleSubtitle =
    document.getElementById(
        "moduleSubtitle"
    );

const recordTitle =
    document.getElementById(
        "recordTitle"
    );

const recordCount =
    document.getElementById(
        "recordCount"
    );

const moduleMessage =
    document.getElementById(
        "moduleMessage"
    );

const moduleTableHead =
    document.getElementById(
        "moduleTableHead"
    );

const moduleTableBody =
    document.getElementById(
        "moduleTableBody"
    );

const emptyRecords =
    document.getElementById(
        "emptyRecords"
    );

if (!moduleNames[moduleName]) {
    window.location.href =
        "/dashboard.html";
} else {
    loadModule();
}

async function loadModule() {
    const token =
        localStorage.getItem("token");

    if (!token) {
        window.location.href = "/";
        return;
    }

    const title =
        moduleNames[moduleName];

    moduleTitle.innerText =
        title;

    moduleSubtitle.innerText =
        "Manage " + title.toLowerCase();

    recordTitle.innerText =
        title;

    moduleMessage.innerText =
        "Loading...";

    try {
        const response =
            await fetch(
                "/api/modules/" +
                moduleName,
                {
                    method: "GET",
                    headers: {
                        "Authorization":
                            "Bearer " + token
                    }
                }
            );

        const data =
            await response.json();

        if (response.status === 401) {
            logout();
            return;
        }

        if (!data.success) {
            moduleMessage.innerText =
                data.message;
            return;
        }

        moduleMessage.innerText = "";

        renderRecords(
            data.records || []
        );
    } catch (error) {
        console.error(
            "MODULE LOAD ERROR:",
            error
        );

        moduleMessage.innerText =
            "Unable to connect to server";
    }
}

function renderRecords(records) {
    moduleTableHead.innerHTML = "";
    moduleTableBody.innerHTML = "";

    recordCount.innerText =
        records.length +
        (
            records.length === 1
                ? " Record"
                : " Records"
        );

    if (records.length === 0) {
        emptyRecords.style.display =
            "block";

        return;
    }

    emptyRecords.style.display =
        "none";

    const columns =
        Object.keys(records[0]);

    const headerRow =
        document.createElement("tr");

    columns.forEach(
        function (column) {
            const th =
                document.createElement("th");

            th.innerText =
                formatColumnName(
                    column
                );

            headerRow.appendChild(th);
        }
    );

    moduleTableHead.appendChild(
        headerRow
    );

    records.forEach(
        function (record) {

            const row =
                document.createElement("tr");

            columns.forEach(
                function (column) {

                    const td =
                        document.createElement(
                            "td"
                        );

                    const value =
                        record[column];

                    if (
                        value === null ||
                        value === undefined
                    ) {
                        td.innerText = "-";
                    } else if (
                        column === "status"
                    ) {
                        td.innerText =
                            Number(value) === 1
                                ? "Active"
                                : "Inactive";
                    } else {
                        td.innerText =
                            formatValue(
                                value
                            );
                    }

                    row.appendChild(td);
                }
            );

            moduleTableBody.appendChild(
                row
            );
        }
    );
}

function formatColumnName(column) {
    return column
        .replaceAll("_", " ")
        .replace(
            /\b\w/g,
            function (letter) {
                return letter.toUpperCase();
            }
        );
}

function formatValue(value) {
    if (
        typeof value === "object"
    ) {
        return JSON.stringify(
            value
        );
    }

    return String(value);
}

function logout() {
    localStorage.removeItem(
        "token"
    );

    localStorage.removeItem(
        "user"
    );

    window.location.href = "/";
}