async function loadBilties() {
    const token = localStorage.getItem("token");

    if (!token) {
        window.location.href = "/index.html";
        return;
    }

    try {
        const response = await fetch("/api/bilties", {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const data = await response.json();

        const biltyList =
            document.getElementById("biltyList");

        const biltyMessage =
            document.getElementById("biltyMessage");

        const biltyCount =
            document.getElementById("biltyCount");

        const emptyBilties =
            document.getElementById("emptyBilties");

        if (!data.success) {
            biltyMessage.innerText = data.message;
            return;
        }

        biltyMessage.innerText = "";

        biltyCount.innerText =
            `${data.bilties.length} Bilty${data.bilties.length === 1 ? "" : "ies"}`;

        if (data.bilties.length === 0) {
            biltyList.innerHTML = "";
            emptyBilties.style.display = "block";
            return;
        }

        emptyBilties.style.display = "none";

        biltyList.innerHTML =
            data.bilties.map(bilty => `
                <tr>
                    <td>${bilty.id}</td>
                    <td>${bilty.company_id}</td>
                    <td>${bilty.bilty_number}</td>
                    <td>${bilty.client_id ?? "-"}</td>
                    <td>${bilty.status}</td>
                    <td>${bilty.trip_id ?? "-"}</td>
                    <td>${bilty.created_at}</td>
                    <td>${bilty.updated_at}</td>
                </tr>
            `).join("");

    } catch (error) {
        console.error("LOAD BILTIES ERROR:", error);

        document.getElementById("biltyMessage").innerText =
            "Unable to connect to server";
    }
}

async function addBilty() {
    const token = localStorage.getItem("token");

    if (!token) {
        window.location.href = "/index.html";
        return;
    }

    const biltyNumber =
        document.getElementById("bilty_number").value.trim();

    const clientId =
        document.getElementById("client_id").value.trim();

    const tripId =
        document.getElementById("trip_id").value.trim();

    const status =
        document.getElementById("status").value;

    const biltyMessage =
        document.getElementById("biltyMessage");

    if (!biltyNumber) {
        biltyMessage.innerText =
            "Bilty number is required";
        return;
    }

    try {
        const response = await fetch("/api/bilties", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                bilty_number: biltyNumber,
                client_id: clientId === "" ? null : Number(clientId),
                trip_id: tripId === "" ? null : Number(tripId),
                status: status
            })
        });

        const data = await response.json();

        biltyMessage.innerText = data.message;

        if (data.success) {
            document.getElementById("bilty_number").value = "";
            document.getElementById("client_id").value = "";
            document.getElementById("trip_id").value = "";
            document.getElementById("status").value = "RESERVED";

            await loadBilties();
        }

    } catch (error) {
        console.error("ADD BILTY ERROR:", error);

        biltyMessage.innerText =
            "Unable to connect to server";
    }
}

loadBilties();