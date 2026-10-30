let driverPage = 1;

const getDriverToken = () => {
    const token = localStorage.getItem("token");

    if (!token) {
        window.location.href = "/index.html";
        return null;
    }

    return token;
};

const driverAuthHeaders = (token) => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
});

const readDriverForm = () => {
    const email = document.getElementById("email").value.trim();
    const address = document.getElementById("address").value.trim();
    const licenseNumber = document.getElementById("license_number").value.trim();

    return {
        name: document.getElementById("name").value.trim(),
        mobile: document.getElementById("mobile").value.trim(),
        email: email === "" ? null : email,
        address: address === "" ? null : address,
        license_number: licenseNumber === "" ? null : licenseNumber,
        status: Number(document.getElementById("status").value)
    };
};

const resetDriverForm = () => {
    document.getElementById("driverId").value = "";
    document.getElementById("name").value = "";
    document.getElementById("mobile").value = "";
    document.getElementById("email").value = "";
    document.getElementById("address").value = "";
    document.getElementById("license_number").value = "";
    document.getElementById("status").value = "1";
    document.getElementById("saveDriver").innerText = "Save Driver";
    document.getElementById("cancelDriverEdit").style.display = "none";
    document.getElementById("licenseGroup").style.display = "";
};

async function loadDrivers(page = driverPage) {
    const token = getDriverToken();

    if (!token) {
        return;
    }

    driverPage = page;

    const params = new URLSearchParams({
        page: String(driverPage),
        limit: "20"
    });

    const search = document.getElementById("driverSearch")?.value.trim();
    const status = document.getElementById("driverStatusFilter")?.value;

    if (search) {
        params.set("search", search);
    }

    if (status !== undefined && status !== "") {
        params.set("status", status);
    }

    try {
        const response = await fetch(`/api/drivers?${params.toString()}`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const data = await response.json();

        const driverList = document.getElementById("driverList");
        const driverMessage = document.getElementById("driverMessage");
        const driverCount = document.getElementById("driverCount");
        const emptyDrivers = document.getElementById("emptyDrivers");
        const paginationBox = document.getElementById("driverPagination");

        if (!data.success) {
            driverMessage.innerText = data.message;
            return;
        }

        driverMessage.innerText = "";

        const total = data.pagination?.total ?? data.drivers.length;

        driverCount.innerText =
            `${total} Driver${total === 1 ? "" : "s"}`;

        if (data.drivers.length === 0) {
            driverList.innerHTML = "";
            emptyDrivers.style.display = "block";
            paginationBox.innerHTML = "";
            return;
        }

        emptyDrivers.style.display = "none";

        driverList.innerHTML = data.drivers.map((driver) => `
            <tr>
                <td>${driver.id}</td>
                <td>${driver.company_id}</td>
                <td>${driver.name}</td>
                <td>${driver.mobile}</td>
                <td>${driver.email ?? "-"}</td>
                <td>${driver.address ?? "-"}</td>
                <td>${Number(driver.status) === 1 ? "Active" : "Inactive"}</td>
                <td>${driver.created_at}</td>
                <td>${driver.updated_at}</td>
                <td>
                    <div class="company-actions">
                        <button
                            type="button"
                            class="edit-company-btn"
                            onclick="editDriver(${driver.id})"
                        >
                            Edit
                        </button>
                        ${Number(driver.status) === 1 ? `
                        <button
                            type="button"
                            class="deactivate-company-btn"
                            onclick="deactivateDriver(${driver.id})"
                        >
                            Deactivate
                        </button>` : ""}
                    </div>
                </td>
            </tr>
        `).join("");

        const totalPages = data.pagination?.totalPages || 1;

        paginationBox.innerHTML = totalPages > 1
            ? `Page ${data.pagination.page} of ${totalPages}
               <button type="button" ${data.pagination.page <= 1 ? "disabled" : ""}
                   onclick="loadDrivers(${data.pagination.page - 1})">Prev</button>
               <button type="button" ${data.pagination.page >= totalPages ? "disabled" : ""}
                   onclick="loadDrivers(${data.pagination.page + 1})">Next</button>`
            : "";
    } catch (error) {
        console.error("LOAD DRIVERS ERROR:", error);

        document.getElementById("driverMessage").innerText =
            "Unable to connect to server";
    }
}

async function editDriver(id) {
    const token = getDriverToken();

    if (!token) {
        return;
    }

    try {
        const response = await fetch(`/api/drivers/${id}`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!data.success) {
            document.getElementById("driverMessage").innerText = data.message;
            return;
        }

        const driver = data.driver;

        document.getElementById("driverId").value = driver.id;
        document.getElementById("name").value = driver.name || "";
        document.getElementById("mobile").value = driver.mobile || "";
        document.getElementById("email").value = driver.email || "";
        document.getElementById("address").value = driver.address || "";
        document.getElementById("status").value = String(Number(driver.status) === 1 ? 1 : 0);
        document.getElementById("license_number").value = "";
        document.getElementById("licenseGroup").style.display = "none";
        document.getElementById("saveDriver").innerText = "Update Driver";
        document.getElementById("cancelDriverEdit").style.display = "inline-block";
        document.getElementById("driverMessage").innerText = "";
        window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
        console.error("EDIT DRIVER ERROR:", error);

        document.getElementById("driverMessage").innerText =
            "Unable to connect to server";
    }
}

async function saveDriver() {
    const token = getDriverToken();

    if (!token) {
        return;
    }

    const payload = readDriverForm();
    const driverMessage = document.getElementById("driverMessage");
    const driverId = document.getElementById("driverId").value;

    if (!payload.name) {
        driverMessage.innerText = "Driver name is required";
        return;
    }

    if (!payload.mobile) {
        driverMessage.innerText = "Mobile number is required";
        return;
    }

    const isEdit = driverId !== "";

    try {
        const response = await fetch(
            isEdit ? `/api/drivers/${driverId}` : "/api/drivers",
            {
                method: isEdit ? "PUT" : "POST",
                headers: driverAuthHeaders(token),
                body: JSON.stringify(payload)
            }
        );

        const data = await response.json();

        driverMessage.innerText = data.message;

        if (data.success) {
            resetDriverForm();
            await loadDrivers(isEdit ? driverPage : 1);
        }
    } catch (error) {
        console.error("SAVE DRIVER ERROR:", error);

        driverMessage.innerText = "Unable to connect to server";
    }
}

async function deactivateDriver(id) {
    const token = getDriverToken();

    if (!token) {
        return;
    }

    if (!window.confirm("Deactivate this driver? Existing trips will stay linked.")) {
        return;
    }

    try {
        const response = await fetch(`/api/drivers/${id}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const data = await response.json();

        document.getElementById("driverMessage").innerText = data.message;

        if (data.success) {
            if (document.getElementById("driverId").value === String(id)) {
                resetDriverForm();
            }

            await loadDrivers(driverPage);
        }
    } catch (error) {
        console.error("DEACTIVATE DRIVER ERROR:", error);

        document.getElementById("driverMessage").innerText =
            "Unable to connect to server";
    }
}

async function fillDriverSelect(selectId) {
    const token = localStorage.getItem("token");
    const select = document.getElementById(selectId);

    if (!token || !select) {
        return;
    }

    try {
        const response = await fetch("/api/drivers?limit=100&status=1", {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!data.success) {
            return;
        }

        const current = select.value;

        select.innerHTML = `<option value="">Select driver</option>` +
            data.drivers.map((driver) =>
                `<option value="${driver.id}">${driver.name} (${driver.mobile})</option>`
            ).join("");

        if (current) {
            select.value = current;
        }
    } catch (error) {
        console.error("FILL DRIVER SELECT ERROR:", error);
    }
}

if (document.getElementById("driverForm")) {
    loadDrivers(1);
}

if (document.getElementById("driver_id") && document.getElementById("driver_id").tagName === "SELECT") {
    fillDriverSelect("driver_id");
}
