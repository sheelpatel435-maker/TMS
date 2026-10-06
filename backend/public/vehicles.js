async function loadVehicles() {
    const token = localStorage.getItem("token");

    if (!token) {
        window.location.href = "/index.html";
        return;
    }

    try {
        const response = await fetch("/api/vehicles", {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const data = await response.json();

        const vehicleList = document.getElementById("vehicleList");
        const vehicleMessage = document.getElementById("vehicleMessage");
        const vehicleCount = document.getElementById("vehicleCount");
        const emptyVehicles = document.getElementById("emptyVehicles");

        if (!data.success) {
            vehicleMessage.innerText = data.message;
            return;
        }

        vehicleMessage.innerText = "";

        vehicleCount.innerText =
            `${data.vehicles.length} Vehicle${data.vehicles.length === 1 ? "" : "s"}`;

        if (data.vehicles.length === 0) {
            vehicleList.innerHTML = "";
            emptyVehicles.style.display = "block";
            return;
        }
        function getVehicleType(vehicleTypeId) {
            if (vehicleTypeId === 1) {
                return "Truck";
            } else if (vehicleTypeId === 2) {
                return "Trailer";
            } else if (vehicleTypeId === 3) {
                return "Container";
            } else {
                return "Unknown";
            }
        }
        emptyVehicles.style.display = "none";

        vehicleList.innerHTML = data.vehicles.map(vehicle => `
            <tr>
                <td>${vehicle.id}</td>
                <td>${vehicle.company_id}</td>
 <td>${getVehicleType(vehicle.vehicle_type_id)}</td>
                <td>${vehicle.registration_no}</td>
                <td>${vehicle.capacity ?? "-"}</td>
                <td>${vehicle.status === 1 ? "Active" : "Inactive"}</td>
                <td>${vehicle.created_at}</td>
                <td>${vehicle.updated_at}</td>
            </tr>
        `).join("");

    } catch (error) {
        console.error("LOAD VEHICLES ERROR:", error);

        document.getElementById("vehicleMessage").innerText =
            "Unable to connect to server";
    }
}

async function addVehicle() {
    const token = localStorage.getItem("token");

    if (!token) {
        window.location.href = "/index.html";
        return;
    }

    const vehicleTypeId =
        document.getElementById("vehicle_type_id").value.trim();

    const registrationNo =
        document.getElementById("registration_no").value.trim();

    const capacity =
        document.getElementById("capacity").value.trim();

    const status =
        document.getElementById("status").value;

    const vehicleMessage =
        document.getElementById("vehicleMessage");

    if (!vehicleTypeId) {
        vehicleMessage.innerText =
            "Vehicle Type ID is required";
        return;
    }

    if (!registrationNo) {
        vehicleMessage.innerText =
            "Registration Number is required";
        return;
    }

    try {
        const response = await fetch("/api/vehicles", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                vehicle_type_id: Number(vehicleTypeId),
                registration_no: registrationNo,
                capacity: capacity === "" ? null : Number(capacity),
                status: Number(status)
            })
        });

        const data = await response.json();

        vehicleMessage.innerText = data.message;

        if (data.success) {
            document.getElementById("vehicle_type_id").value = "";
            document.getElementById("registration_no").value = "";
            document.getElementById("capacity").value = "";
            document.getElementById("status").value = "1";

            await loadVehicles();
        }

    } catch (error) {
        console.error("ADD VEHICLE ERROR:", error);

        vehicleMessage.innerText =
            "Unable to connect to server";
    }
}

loadVehicles();