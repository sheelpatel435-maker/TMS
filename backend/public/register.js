document.addEventListener(
    "DOMContentLoaded",
    function () {
        loadCompanies();
        setupRegister();
    }
);

async function loadCompanies() {
    const companySelect =
        document.getElementById("company");

    try {
        const response =
            await fetch("/api/companies");

        const data =
            await response.json();

        if (!response.ok || !data.success) {
            companySelect.innerHTML =
                `<option value="">Unable to load companies</option>`;

            return;
        }

        companySelect.innerHTML =
            `<option value="">Select Company</option>`;

        data.companies.forEach(
            function (company) {

                const option =
                    document.createElement("option");

                option.value =
                    company.id;

                option.textContent =
                    company.name;

                companySelect.appendChild(option);
            }
        );

        if (data.companies.length === 0) {
            companySelect.innerHTML =
                `<option value="">No companies available</option>`;
        }

    } catch (error) {

        console.error(
            "COMPANY LOAD ERROR:",
            error
        );

        companySelect.innerHTML =
            `<option value="">Unable to load companies</option>`;
    }
}

function setupRegister() {

    const registerForm =
        document.getElementById("registerForm");

    registerForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            const name =
                document
                    .getElementById("name")
                    .value
                    .trim();

            const mobile =
                document
                    .getElementById("phone")
                    .value
                    .trim();

            const email =
                document
                    .getElementById("email")
                    .value
                    .trim();

            const companyId =
                document
                    .getElementById("company")
                    .value;

            const password =
                document
                    .getElementById("password")
                    .value;

            const confirmPassword =
                document
                    .getElementById("confirmPassword")
                    .value;

            const message =
                document.getElementById(
                    "registerMessage"
                );

            message.textContent = "";

            if (password !== confirmPassword) {

                message.textContent =
                    "Passwords do not match";

                return;
            }

            if (!companyId) {

                message.textContent =
                    "Please select a company";

                return;
            }

            try {

                const response =
                    await fetch(
                        "/api/register",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body: JSON.stringify({
                                name: name,
                                email: email,
                                mobile: mobile,
                                password: password,
                                company_id: companyId
                            })
                        }
                    );

                const data =
                    await response.json();

                if (!response.ok) {

                    message.textContent =
                        data.message ||
                        "Registration failed";

                    return;
                }

                message.textContent =
                    data.message;

                registerForm.reset();

                setTimeout(
                    function () {
                        window.location.href =
                            "/index.html";
                    },
                    1500
                );

            } catch (error) {

                console.error(
                    "REGISTER ERROR:",
                    error
                );

                message.textContent =
                    "Unable to connect to server";
            }
        }
    );
}