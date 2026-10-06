async function loadDrivers() {
    const token = localStorage.getItem("token");

    if (!token) {
        window.location.href = "/index.html";
        return;
    }

    try {
        const response = await fetch("/api/drivers", {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const data = await response.json();

        const driverList =
            document.getElementById("driverList");

        const driverMessage =
            document.getElementById("driverMessage");

        const driverCount =
            document.getElementById("driverCount");

        const emptyDrivers =
            document.getElementById("emptyDrivers");

        if (!data.success) {
            driverMessage.innerText = data.message;
            return;
        }

        driverMessage.innerText = "";

        driverCount.innerText =
            `${data.drivers.length} Driver${data.drivers.length === 1 ? "" : "s"}`;

        if (data.drivers.length === 0) {
            driverList.innerHTML = "";
            emptyDrivers.style.display = "block";
            return;
        }

        emptyDrivers.style.display = "none";

        driverList.innerHTML =
            data.drivers.map(driver => `
                <tr>
                    <td>${driver.id}</td>
                    <td>${driver.company_id}</td>
                    <td>${driver.name}</td>
                    <td>${driver.mobile}</td>
                    <td>${driver.email ?? "-"}</td>
                    <td>${driver.address ?? "-"}</td>
                    <td>${driver.status === 1 ? "Active" : "Inactive"}</td>
                    <td>${driver.created_at}</td>
                    <td>${driver.updated_at}</td>
                </tr>
            `).join("");

    } catch (error) {
        console.error("LOAD DRIVERS ERROR:", error);

        document.getElementById("driverMessage").innerText =
            "Unable to connect to server";
    }
}

async function addDriver() {
    const token = localStorage.getItem("token");

    if (!token) {
        window.location.href = "/index.html";
        return;
    }

    const name =
        document.getElementById("name").value.trim();

    const mobile =
        document.getElementById("mobile").value.trim();

    const email =
        document.getElementById("email").value.trim();

    const address =
        document.getElementById("address").value.trim();

    const status =
        document.getElementById("status").value;

    const driverMessage =
        document.getElementById("driverMessage");

    if (!name) {
        driverMessage.innerText =
            "Driver name is required";
        return;
    }

    if (!mobile) {
        driverMessage.innerText =
            "Mobile number is required";
        return;
    }

    try {
        const response = await fetch("/api/drivers", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                name: name,
                mobile: mobile,
                email: email === "" ? null : email,
                address: address === "" ? null : address,
                status: Number(status)
            })
        });

        const data = await response.json();

        driverMessage.innerText = data.message;

        if (data.success) {
            document.getElementById("name").value = "";
            document.getElementById("mobile").value = "";
            document.getElementById("email").value = "";
            document.getElementById("address").value = "";
            document.getElementById("status").value = "1";

            await loadDrivers();
        }

    } catch (error) {
        console.error("ADD DRIVER ERROR:", error);

        driverMessage.innerText =
            "Unable to connect to server";
    }
}

loadDrivers();