async function loadClients() {
    const token = localStorage.getItem("token");

    if (!token) {
        window.location.href = "/index.html";
        return;
    }

    try {
        const response = await fetch("/api/clients", {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const data = await response.json();

        const clientList =
            document.getElementById("clientList");

        const clientMessage =
            document.getElementById("clientMessage");

        const clientCount =
            document.getElementById("clientCount");

        const emptyClients =
            document.getElementById("emptyClients");

        if (!data.success) {
            clientMessage.innerText = data.message;
            return;
        }

        clientMessage.innerText = "";

        clientCount.innerText =
            `${data.clients.length} Client${data.clients.length === 1 ? "" : "s"}`;

        if (data.clients.length === 0) {
            clientList.innerHTML = "";
            emptyClients.style.display = "block";
            return;
        }

        emptyClients.style.display = "none";

        clientList.innerHTML =
            data.clients.map(client => `
                <tr>
                    <td>${client.id}</td>
                    <td>${client.company_id}</td>
                    <td>${client.name}</td>
                    <td>${client.mobile ?? "-"}</td>
                    <td>${client.email ?? "-"}</td>
                    <td>${client.address ?? "-"}</td>
                    <td>${client.gst_number ?? "-"}</td>
                    <td>${client.status === 1 ? "Active" : "Inactive"}</td>
                    <td>${client.created_at}</td>
                    <td>${client.updated_at}</td>
                </tr>
            `).join("");

    } catch (error) {
        console.error("LOAD CLIENTS ERROR:", error);

        document.getElementById("clientMessage").innerText =
            "Unable to connect to server";
    }
}

async function addClient() {
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

    const gstNumber =
        document.getElementById("gst_number").value.trim();

    const status =
        document.getElementById("status").value;

    const clientMessage =
        document.getElementById("clientMessage");

    if (!name) {
        clientMessage.innerText =
            "Client name is required";
        return;
    }

    try {
        const response = await fetch("/api/clients", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                name: name,
                mobile: mobile === "" ? null : mobile,
                email: email === "" ? null : email,
                address: address === "" ? null : address,
                gst_number: gstNumber === "" ? null : gstNumber,
                status: Number(status)
            })
        });

        const data = await response.json();

        clientMessage.innerText = data.message;

        if (data.success) {
            document.getElementById("name").value = "";
            document.getElementById("mobile").value = "";
            document.getElementById("email").value = "";
            document.getElementById("address").value = "";
            document.getElementById("gst_number").value = "";
            document.getElementById("status").value = "1";

            await loadClients();
        }

    } catch (error) {
        console.error("ADD CLIENT ERROR:", error);

        clientMessage.innerText =
            "Unable to connect to server";
    }
}

loadClients();