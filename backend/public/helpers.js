async function loadHelpers() {
    const token = localStorage.getItem("token");

    if (!token) {
        window.location.href = "/index.html";
        return;
    }

    try {
        const response = await fetch("/api/helpers", {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const data = await response.json();

        const helperList =
            document.getElementById("helperList");

        const helperMessage =
            document.getElementById("helperMessage");

        const helperCount =
            document.getElementById("helperCount");

        const emptyHelpers =
            document.getElementById("emptyHelpers");

        if (!data.success) {
            helperMessage.innerText = data.message;
            return;
        }

        helperMessage.innerText = "";

        helperCount.innerText =
            `${data.helpers.length} Helper${data.helpers.length === 1 ? "" : "s"}`;

        if (data.helpers.length === 0) {
            helperList.innerHTML = "";
            emptyHelpers.style.display = "block";
            return;
        }

        emptyHelpers.style.display = "none";

        helperList.innerHTML =
            data.helpers.map(helper => `
                <tr>
                    <td>${helper.id}</td>
                    <td>${helper.company_id}</td>
                    <td>${helper.name}</td>
                    <td>${helper.mobile}</td>
                    <td>${helper.email ?? "-"}</td>
                    <td>${helper.address ?? "-"}</td>
                    <td>${helper.status === 1 ? "Active" : "Inactive"}</td>
                    <td>${helper.created_at}</td>
                    <td>${helper.updated_at}</td>
                </tr>
            `).join("");

    } catch (error) {
        console.error("LOAD HELPERS ERROR:", error);

        document.getElementById("helperMessage").innerText =
            "Unable to connect to server";
    }
}

async function addHelper() {
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

    const helperMessage =
        document.getElementById("helperMessage");

    if (!name) {
        helperMessage.innerText =
            "Helper name is required";
        return;
    }

    if (!mobile) {
        helperMessage.innerText =
            "Mobile number is required";
        return;
    }

    try {
        const response = await fetch("/api/helpers", {
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

        helperMessage.innerText = data.message;

        if (data.success) {
            document.getElementById("name").value = "";
            document.getElementById("mobile").value = "";
            document.getElementById("email").value = "";
            document.getElementById("address").value = "";
            document.getElementById("status").value = "1";

            await loadHelpers();
        }

    } catch (error) {
        console.error("ADD HELPER ERROR:", error);

        helperMessage.innerText =
            "Unable to connect to server";
    }
}

loadHelpers();