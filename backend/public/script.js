const loginForm =
    document.getElementById("loginForm");

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            const email =
                document
                    .getElementById("loginEmail")
                    .value
                    .trim();

            const password =
                document
                    .getElementById("loginPassword")
                    .value;

            const message =
                document.getElementById(
                    "loginMessage"
                );

            if (!email || !password) {

                message.innerText =
                    "Please enter email and password";

                return;
            }

            message.innerText =
                "Logging in...";

            try {

                const response =
                    await fetch(
                        "/api/login",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({
                                    email: email,
                                    password: password
                                })
                        }
                    );

                const data =
                    await response.json();

                if (data.success) {

                    localStorage.setItem(
                        "token",
                        data.token
                    );

                    localStorage.setItem(
                        "user",
                        JSON.stringify(data.user)
                    );

                    window.location.href =
                        "/dashboard.html";

                } else {

                    message.innerText =
                        data.message;
                }

            } catch (error) {

                console.error(
                    error
                );

                message.innerText =
                    "Unable to connect to server";
            }
        }
    );
}


const registerForm =
    document.getElementById(
        "registerForm"
    );

if (registerForm) {

    registerForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            const name =
                document
                    .getElementById("name")
                    .value
                    .trim();

            const email =
                document
                    .getElementById("email")
                    .value
                    .trim();

            const mobile =
                document
                    .getElementById("phone")
                    .value
                    .trim();

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

            if (
                !name ||
                !email ||
                !mobile ||
                !password ||
                !confirmPassword
            ) {

                message.innerText =
                    "Please fill all fields";

                return;
            }

            if (
                password !==
                confirmPassword
            ) {

                message.innerText =
                    "Passwords do not match";

                return;
            }

            if (password.length < 6) {

                message.innerText =
                    "Password must be at least 6 characters";

                return;
            }

            message.innerText =
                "Creating account...";

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

                            body:
                                JSON.stringify({
                                    name: name,
                                    email: email,
                                    mobile: mobile,
                                    password: password
                                })
                        }
                    );

                const data =
                    await response.json();

                if (data.success) {

                    window.location.href =
                        "/";

                } else {

                    message.innerText =
                        data.message;
                }

            } catch (error) {

                console.error(
                    error
                );

                message.innerText =
                    "Unable to connect to server";
            }
        }
    );
}


const dashboardContainer =
    document.querySelector(
        ".dashboard-container"
    );

if (
    dashboardContainer &&
    !document.getElementById("profileForm") &&
    !document.getElementById("companyForm")
) {

    loadDashboard();
}


async function loadDashboard() {

    const token =
        localStorage.getItem("token");

    if (!token) {

        window.location.href = "/";

        return;
    }

    const userData =
        localStorage.getItem("user");

    if (userData) {

        try {

            const user =
                JSON.parse(userData);

            const welcome =
                document.getElementById(
                    "welcomeMessage"
                );

            const userName =
                document.getElementById(
                    "userName"
                );

            const userEmail =
                document.getElementById(
                    "userEmail"
                );

            if (welcome) {

                welcome.innerText =
                    "Welcome, " + user.name;
            }

            if (userName) {

                userName.innerText =
                    user.name;
            }

            if (userEmail) {

                userEmail.innerText =
                    user.email || "-";
            }

        } catch (error) {

            localStorage.removeItem("user");
        }
    }

    try {

        const response =
            await fetch(
                "/api/dashboard",
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

            const message =
                document.getElementById(
                    "dashboardMessage"
                );

            if (message) {

                message.innerText =
                    data.message;
            }

            return;
        }

        document.getElementById(
            "vehicleCount"
        ).innerText =
            data.stats.vehicles;

        document.getElementById(
            "driverCount"
        ).innerText =
            data.stats.drivers;

        document.getElementById(
            "helperCount"
        ).innerText =
            data.stats.helpers;

        document.getElementById(
            "clientCount"
        ).innerText =
            data.stats.clients;

        document.getElementById(
            "biltyCount"
        ).innerText =
            data.stats.bilties;

        document.getElementById(
            "tripCount"
        ).innerText =
            data.stats.trips;

        document.getElementById(
            "invoiceCount"
        ).innerText =
            data.stats.invoices;

        if (data.message) {

            document.getElementById(
                "dashboardMessage"
            ).innerText =
                data.message;
        }

    } catch (error) {

        console.error(
            error
        );

        const message =
            document.getElementById(
                "dashboardMessage"
            );

        if (message) {

            message.innerText =
                "Unable to connect to server";
        }
    }
}


const profileForm =
    document.getElementById(
        "profileForm"
    );

if (profileForm) {

    loadProfile();

    profileForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            const token =
                localStorage.getItem("token");

            const message =
                document.getElementById(
                    "profileMessage"
                );

            const button =
                document.getElementById(
                    "updateProfileButton"
                );

            if (!token) {

                window.location.href =
                    "/";

                return;
            }

            const name =
                document
                    .getElementById(
                        "profileName"
                    )
                    .value
                    .trim();

            const email =
                document
                    .getElementById(
                        "profileEmail"
                    )
                    .value
                    .trim();

            const mobile =
                document
                    .getElementById(
                        "profileMobile"
                    )
                    .value
                    .trim();

            if (
                !name ||
                !email ||
                !mobile
            ) {

                message.innerText =
                    "Please fill all fields";

                return;
            }

            message.innerText =
                "Updating profile...";

            button.disabled =
                true;

            try {

                const response =
                    await fetch(
                        "/api/profile",
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
                                    email: email,
                                    mobile: mobile
                                })
                        }
                    );

                const data =
                    await response.json();

                if (response.status === 401) {

                    logout();

                    return;
                }

                if (data.success) {

                    localStorage.setItem(
                        "user",
                        JSON.stringify(
                            data.user
                        )
                    );

                    document.getElementById(
                        "profileName"
                    ).value =
                        data.user.name;

                    document.getElementById(
                        "profileEmail"
                    ).value =
                        data.user.email || "";

                    document.getElementById(
                        "profileMobile"
                    ).value =
                        data.user.mobile;

                    document.getElementById(
                        "profileUserType"
                    ).value =
                        data.user.user_type;

                    document.getElementById(
                        "profileStatus"
                    ).value =
                        data.user.status === 1
                            ? "Active"
                            : "Inactive";

                    message.innerText =
                        "Profile updated successfully.";

                } else {

                    message.innerText =
                        data.message;
                }

            } catch (error) {

                console.error(
                    error
                );

                message.innerText =
                    "Unable to connect to server";

            } finally {

                button.disabled =
                    false;
            }
        }
    );
}


async function loadProfile() {

    const token =
        localStorage.getItem("token");

    if (!token) {

        window.location.href =
            "/";

        return;
    }

    const message =
        document.getElementById(
            "profileMessage"
        );

    try {

        const response =
            await fetch(
                "/api/profile",
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

        if (data.success) {

            document.getElementById(
                "profileName"
            ).value =
                data.user.name || "";

            document.getElementById(
                "profileEmail"
            ).value =
                data.user.email || "";

            document.getElementById(
                "profileMobile"
            ).value =
                data.user.mobile || "";

            document.getElementById(
                "profileUserType"
            ).value =
                data.user.user_type || "";

            document.getElementById(
                "profileStatus"
            ).value =
                data.user.status === 1
                    ? "Active"
                    : "Inactive";

            localStorage.setItem(
                "user",
                JSON.stringify(
                    data.user
                )
            );

        } else {

            message.innerText =
                data.message;
        }

    } catch (error) {

        console.error(
            error
        );

        message.innerText =
            "Unable to connect to server";
    }
}


function logout() {

    localStorage.removeItem(
        "token"
    );

    localStorage.removeItem(
        "user"
    );

    window.location.href =
        "/";
}