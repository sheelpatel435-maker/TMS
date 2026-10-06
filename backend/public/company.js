const companyForm =
    document.getElementById("companyForm");

const companyFormCard =
    document.getElementById("companyFormCard");

const addCompanyButton =
    document.getElementById("addCompanyButton");

const cancelCompanyButton =
    document.getElementById("cancelCompanyButton");

const companyTableBody =
    document.getElementById("companyTableBody");

const companyMessage =
    document.getElementById("companyMessage");

const companyCount =
    document.getElementById("companyCount");

const emptyCompany =
    document.getElementById("emptyCompany");

const saveCompanyButton =
    document.getElementById("saveCompanyButton");

const companyFormTitle =
    document.getElementById("companyFormTitle");

const companyId =
    document.getElementById("companyId");

const companyName =
    document.getElementById("companyName");

const companyStatus =
    document.getElementById("companyStatus");

let companies = [];

document.addEventListener(
    "DOMContentLoaded",
    function () {
        companyFormCard.style.display = "none";
        loadCompanies();
    }
);

addCompanyButton.addEventListener(
    "click",
    function () {
        openCreateForm();
    }
);

cancelCompanyButton.addEventListener(
    "click",
    function () {
        closeCompanyForm();
    }
);

companyForm.addEventListener(
    "submit",
    async function (event) {
        event.preventDefault();

        const token =
            localStorage.getItem("token");

        if (!token) {
            window.location.href = "/";
            return;
        }

        const name =
            companyName.value.trim();

        const status =
            Number(companyStatus.value);

        if (!name) {
            showMessage(
                "Company name is required",
                false
            );
            return;
        }

        const id =
            companyId.value;

        saveCompanyButton.disabled = true;

        saveCompanyButton.innerText =
            id
                ? "Updating..."
                : "Creating...";

        try {
            let response;

            if (id) {
                response =
                    await fetch(
                        "/api/companies/" + id,
                        {
                            method: "PUT",
                            headers: {
                                "Content-Type":
                                    "application/json",
                                "Authorization":
                                    "Bearer " + token
                            },
                            body:
                                JSON.stringify({
                                    name: name,
                                    status: status
                                })
                        }
                    );
            } else {
                response =
                    await fetch(
                        "/api/companies",
                        {
                            method: "POST",
                            headers: {
                                "Content-Type":
                                    "application/json",
                                "Authorization":
                                    "Bearer " + token
                            },
                            body:
                                JSON.stringify({
                                    name: name
                                })
                        }
                    );
            }

            const data =
                await response.json();

            if (response.status === 401) {
                logout();
                return;
            }

            if (!data.success) {
                showMessage(
                    data.message,
                    false
                );
                return;
            }

            if (data.token) {
                localStorage.setItem(
                    "token",
                    data.token
                );
            }

            if (data.user) {
                localStorage.setItem(
                    "user",
                    JSON.stringify(
                        data.user
                    )
                );
            }

            showMessage(
                data.message,
                true
            );

            closeCompanyForm();

            await loadCompanies();

        } catch (error) {
            console.error(
                "COMPANY SAVE ERROR:",
                error
            );

            showMessage(
                "Unable to connect to server",
                false
            );
        } finally {
            saveCompanyButton.disabled =
                false;
        }
    }
);

async function loadCompanies() {

    const token =
        localStorage.getItem("token");

    if (!token) {
        window.location.href = "/";
        return;
    }

    try {
        const response =
            await fetch(
                "/api/companies",
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
            showMessage(
                data.message,
                false
            );
            return;
        }

        companies =
            data.companies || [];

        renderCompanies();

    } catch (error) {
        console.error(
            "COMPANY LOAD ERROR:",
            error
        );

        showMessage(
            "Unable to connect to server",
            false
        );
    }
}

function renderCompanies() {

    companyTableBody.innerHTML = "";

    companyCount.innerText =
        companies.length +
        (
            companies.length === 1
                ? " Company"
                : " Companies"
        );

    if (companies.length === 0) {

        emptyCompany.style.display =
            "block";

        return;
    }

    emptyCompany.style.display =
        "none";

    companies.forEach(
        function (company) {

            const row =
                document.createElement("tr");

            const statusText =
                Number(company.status) === 1
                    ? "Active"
                    : "Inactive";

            const statusClass =
                Number(company.status) === 1
                    ? "status-active"
                    : "status-inactive";

            row.innerHTML = `
                <td>${company.id}</td>
                <td>${escapeHtml(company.name)}</td>
                <td>
                    <span class="${statusClass}">
                        ${statusText}
                    </span>
                </td>
                <td>${formatDate(company.created_at)}</td>
                <td>${formatDate(company.updated_at)}</td>
                <td>
                    <div class="company-actions">
                        <button
                            type="button"
                            class="edit-company-btn"
                            onclick="editCompany(${company.id})"
                        >
                            Edit
                        </button>
                        ${
                            Number(company.status) === 1
                                ? `
                                    <button
                                        type="button"
                                        class="deactivate-company-btn"
                                        onclick="deactivateCompany(${company.id})"
                                    >
                                        Deactivate
                                    </button>
                                  `
                                : ""
                        }
                    </div>
                </td>
            `;

            companyTableBody.appendChild(row);
        }
    );
}

function editCompany(id) {

    const company =
        companies.find(
            function (item) {
                return Number(item.id) ===
                    Number(id);
            }
        );

    if (!company) {
        return;
    }

    companyId.value =
        company.id;

    companyName.value =
        company.name;

    companyStatus.value =
        company.status;

    companyFormTitle.innerText =
        "Edit Company";

    saveCompanyButton.innerText =
        "Update Company";

    companyFormCard.style.display =
        "block";

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

async function deactivateCompany(id) {

    const token =
        localStorage.getItem("token");

    if (!token) {
        window.location.href = "/";
        return;
    }

    const confirmed =
        confirm(
            "Do you want to deactivate this company?"
        );

    if (!confirmed) {
        return;
    }

    try {
        const response =
            await fetch(
                "/api/companies/" + id,
                {
                    method: "DELETE",
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
            showMessage(
                data.message,
                false
            );
            return;
        }

        showMessage(
            data.message,
            true
        );

        await loadCompanies();

    } catch (error) {
        console.error(
            "COMPANY DEACTIVATE ERROR:",
            error
        );

        showMessage(
            "Unable to connect to server",
            false
        );
    }
}

function openCreateForm() {

    companyId.value =
        "";

    companyName.value =
        "";

    companyStatus.value =
        "1";

    companyFormTitle.innerText =
        "Add Company";

    saveCompanyButton.innerText =
        "Create Company";

    companyFormCard.style.display =
        "block";

    companyName.focus();
}

function closeCompanyForm() {

    companyForm.reset();

    companyId.value =
        "";

    companyStatus.value =
        "1";

    companyFormTitle.innerText =
        "Add Company";

    saveCompanyButton.innerText =
        "Create Company";

    companyFormCard.style.display =
        "none";
}

function formatDate(value) {

    if (!value) {
        return "-";
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return value;
    }

    return date.toLocaleString();
}

function escapeHtml(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function showMessage(
    message,
    success
) {

    companyMessage.innerText =
        message;

    companyMessage.className =
        success
            ? "company-message success"
            : "company-message error";

    setTimeout(
        function () {
            companyMessage.innerText =
                "";
            companyMessage.className =
                "company-message";
        },
        3000
    );
}