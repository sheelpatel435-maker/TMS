const bearer = [{ bearerAuth: [] }];

const listParams = [
    { name: "page", in: "query", schema: { type: "integer", default: 1 } },
    { name: "limit", in: "query", schema: { type: "integer", default: 20, maximum: 100 } },
    { name: "search", in: "query", schema: { type: "string" } },
    { name: "status", in: "query", schema: { type: "string" } },
    { name: "from", in: "query", schema: { type: "string", format: "date" } },
    { name: "to", in: "query", schema: { type: "string", format: "date" } },
    {
        name: "company_id",
        in: "query",
        description: "Super admin only. Other users are locked to the company on their token.",
        schema: { type: "integer" }
    }
];

const idParam = {
    name: "id",
    in: "path",
    required: true,
    schema: { type: "integer" }
};

const ok = {
    200: { description: "Success" },
    400: { description: "Validation error" },
    401: { description: "Missing or invalid token" },
    403: { description: "No permission for this module" },
    404: { description: "Record not found" }
};

const created = {
    201: { description: "Created" },
    400: { description: "Validation error" },
    401: { description: "Missing or invalid token" },
    403: { description: "No permission for this module" }
};

const jsonBody = (example, required = []) => ({
    required: true,
    content: {
        "application/json": {
            schema: {
                type: "object",
                required,
                example
            }
        }
    }
});

const secured = (tag, summary, extra = {}) => ({
    tags: [tag],
    summary,
    security: bearer,
    responses: ok,
    ...extra
});

const crud = (tag, summary, example, required = []) => ({
    get: secured(tag, `List ${summary}`, { parameters: listParams }),
    post: secured(tag, `Create ${summary}`, {
        requestBody: jsonBody(example, required),
        responses: created
    })
});

const itemOps = (tag, summary, example) => ({
    get: secured(tag, `Get ${summary} by id`, { parameters: [idParam] }),
    put: secured(tag, `Update ${summary}`, {
        parameters: [idParam],
        requestBody: jsonBody(example)
    }),
    delete: secured(tag, `Deactivate ${summary}`, {
        parameters: [idParam],
        description: "Sets status to inactive or cancelled. The row is not hard-deleted."
    })
});

const spec = {
    openapi: "3.0.3",
    info: {
        title: "TMS API",
        version: "1.0.0",
        description:
            "Transport Management System. Login first, then click Authorize and paste the token. " +
            "SUPER_ADMIN and COMPANY_ADMIN bypass module permissions. COMPANY_USER needs a flag in user_module_access. " +
            "Company-scoped operations use the user's company; SUPER_ADMIN can optionally select an active company with X-Company-Id."
    },
    servers: [{ url: "http://localhost:5000", description: "Local server" }],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: "http",
                scheme: "bearer",
                bearerFormat: "JWT"
            }
        }
    },
    tags: [
        { name: "Auth" },
        { name: "Companies" },
        { name: "Access" },
        { name: "Vehicles" },
        { name: "Drivers" },
        { name: "Helpers" },
        { name: "Clients" },
        { name: "Bilty" },
        { name: "Trips" },
        { name: "Invoices" },
        { name: "Payments" },
        { name: "Reports" }
    ],
    paths: {
        "/api": {
            get: {
                tags: ["Auth"],
                summary: "Health check",
                responses: { 200: { description: "API is working" } }
            }
        },
        "/api/register": {
            post: {
                tags: ["Auth"],
                summary: "Deprecated: user creation is available through POST /api/users",
                security: [{ bearerAuth: [] }],
                responses: {
                    401: { description: "Authentication is required" },
                    403: { description: "Admin access is required" },
                    410: { description: "This endpoint has been removed; use POST /api/users" }
                }
            }
        },
        "/api/login": {
            post: {
                tags: ["Auth"],
                summary: "Login and receive a JWT",
                requestBody: jsonBody(
                    { email: "admin@tms.com", password: "Secret123" },
                    ["email", "password"]
                ),
                responses: {
                    200: { description: "Returns token and refresh_token" },
                    401: { description: "Invalid email or password" },
                    429: { description: "Too many failed attempts" }
                }
            }
        },
        "/api/refresh": {
            post: {
                tags: ["Auth"],
                summary: "Rotate refresh token",
                requestBody: jsonBody({ refresh_token: "paste-refresh-token" }, ["refresh_token"]),
                responses: ok
            }
        },
        "/api/logout": {
            post: secured("Auth", "Logout and revoke the access token", {
                requestBody: jsonBody({ refresh_token: "optional" })
            })
        },
        "/api/profile": {
            get: secured("Auth", "Current user profile")
        },
        "/api/auth/login": { post: { $ref: "#/paths/~1api~1login/post" } },
        "/api/auth/register": { post: { $ref: "#/paths/~1api~1register/post" } },
        "/api/auth/refresh": { post: { $ref: "#/paths/~1api~1refresh/post" } },
        "/api/auth/logout": { post: { $ref: "#/paths/~1api~1logout/post" } },
        "/api/auth/profile": { get: { $ref: "#/paths/~1api~1profile/get" } },
        "/api/auth/otp/request": {
            post: {
                tags: ["Auth"],
                summary: "Request a login OTP for a driver or helper",
                requestBody: jsonBody({ mobile: "9876543210" }, ["mobile"]),
                responses: {
                    200: { description: "A generic response is returned whether or not the mobile is registered" },
                    400: { description: "Invalid mobile number" },
                    429: { description: "Too many OTP requests" }
                }
            }
        },
        "/api/auth/otp/verify": {
            post: {
                tags: ["Auth"],
                summary: "Verify a login OTP and receive tokens",
                requestBody: jsonBody({ mobile: "9876543210", otp: "123456" }, ["mobile", "otp"]),
                responses: {
                    200: { description: "Returns access and refresh tokens" },
                    401: { description: "OTP is invalid or expired" },
                    429: { description: "Too many verification attempts" }
                }
            }
        },
        "/api/auth/password/forgot": {
            post: {
                tags: ["Auth"],
                summary: "Request a password-reset OTP",
                requestBody: jsonBody({ mobile: "9876543210" }, ["mobile"]),
                responses: {
                    200: { description: "A generic response is returned whether or not the mobile is registered" },
                    400: { description: "Invalid mobile number" },
                    429: { description: "Too many OTP requests" }
                }
            }
        },
        "/api/auth/password/reset": {
            post: {
                tags: ["Auth"],
                summary: "Reset a password using an OTP",
                requestBody: jsonBody(
                    { mobile: "9876543210", otp: "123456", new_password: "Secret123" },
                    ["mobile", "otp", "new_password"]
                ),
                responses: {
                    200: { description: "Password reset; existing sessions are revoked" },
                    400: { description: "Invalid input or weak password" },
                    401: { description: "OTP is invalid or expired" }
                }
            }
        },
        "/api/auth/password/change": {
            post: secured("Auth", "Change the current user's password", {
                requestBody: jsonBody(
                    { current_password: "Current123", new_password: "NewSecret123" },
                    ["current_password", "new_password"]
                ),
                responses: {
                    200: { description: "Password changed; a new session is returned" },
                    400: { description: "Current password is incorrect or new password is invalid" },
                    401: { description: "Missing or invalid token" },
                    429: { description: "Too many attempts" }
                }
            })
        },
        "/api/dashboard": {
            get: secured("Reports", "Dashboard counts, including documents expiring in 30 days")
        },
        "/api/companies": {
            get: secured("Companies", "List companies for the current user. Super admin sees all."),
            post: secured("Companies", "Create a company. Super admin only.", {
                requestBody: jsonBody({ name: "TMS Demo Company" }, ["name"]),
                responses: created
            })
        },
        "/api/companies/{id}": {
            get: secured("Companies", "Get one company", { parameters: [idParam] }),
            put: secured("Companies", "Update company name and status. Super admin only.", {
                parameters: [idParam],
                requestBody: jsonBody({ name: "TMS Demo Company", status: 1 }, ["name", "status"])
            }),
            delete: secured("Companies", "Deactivate a company. Super admin only.", {
                parameters: [idParam]
            })
        },
        "/api/modules": {
            get: secured("Access", "List module definitions. Admin only.", { parameters: listParams })
        },
        "/api/modules/{type}": {
            get: secured("Access", "Records for a module page", {
                parameters: [
                    {
                        name: "type",
                        in: "path",
                        required: true,
                        schema: {
                            type: "string",
                            enum: ["vehicles", "drivers", "helpers", "clients", "bilties", "trips", "invoices"]
                        }
                    }
                ]
            })
        },
        "/api/users": {
            get: secured("Access", "List company users. Admin only.", {
                parameters: listParams
            }),
            post: secured(
                "Access",
                "Create a COMPANY_USER in the authenticated company.",
                {
                    description:
                        "Only COMPANY_ADMIN or SUPER_ADMIN can call this endpoint. user_type is optional; if sent, " +
                        "it must be exactly COMPANY_USER. The server always sets user_type=COMPANY_USER and " +
                        "company_id from the authenticated user. name, mobile, and password are required; email " +
                        "is optional. Mobile follows the existing authentication format of 10 to 15 digits after " +
                        "normalization; a +91 prefix may be supplied and is removed before saving. Mobile is " +
                        "saved normalized. Email is validated and lowercased. Mobile and email are checked " +
                        "for duplicates in application code and protected by database unique indexes after applying " +
                        "the users contact migration. Successful creation is audit-logged without password data.",
                    requestBody: jsonBody(
                        {
                            name: "Company User",
                            mobile: "+91 98765-43210",
                            email: "office@tms.com",
                            password: "Secret123",
                            user_type: "COMPANY_USER"
                        },
                        ["name", "mobile", "password"]
                    ),
                    responses: {
                        201: { description: "User created and audit-logged" },
                        400: { description: "Required fields, password, or company validation failed" },
                        401: { description: "Authentication is required" },
                        403: { description: "Only SUPER_ADMIN or COMPANY_ADMIN can create users" },
                        409: { description: "Email is already registered or a database uniqueness constraint failed" }
                    }
                }
            )
        },
        "/api/users/{id}": {
            get: secured("Access", "Get one user", { parameters: [idParam] }),
            put: secured("Access", "Update a COMPANY_USER or update your own name/password", {
                parameters: [idParam],
                requestBody: jsonBody({
                    name: "Company User",
                    mobile: "+91 98765-43210",
                    email: "office@tms.com",
                    password: "NewSecret123"
                }),
                responses: {
                    200: { description: "User updated; response never includes password or password hash" },
                    400: { description: "Unsupported field, including user_type, company_id, or status; or invalid contact data" },
                    403: { description: "Only same-company COMPANY_USER accounts can be managed; self edits are limited to name/password" },
                    404: { description: "User not found in the current company" },
                    409: { description: "Mobile number or email is already registered" }
                }
            }),
            patch: { $ref: "#/paths/~1api~1users~1{id}/put" },
            delete: secured("Access", "Deactivate a COMPANY_USER", { parameters: [idParam] })
        },
        "/api/users/{id}/status": {
            patch: secured("Access", "Activate or deactivate a COMPANY_USER", {
                parameters: [idParam],
                requestBody: jsonBody({ status: 0 }, ["status"]),
                responses: {
                    200: { description: "Status changed in a transaction; deactivation invalidates access and refresh tokens" },
                    400: { description: "Status must be 0 or 1" },
                    403: { description: "Self status changes and non-COMPANY_USER targets are forbidden" },
                    404: { description: "User not found in the current company" }
                }
            })
        },
        "/api/user-module-access/{userId}": {
            get: secured("Access", "Flags for one user", {
                parameters: [{ name: "userId", in: "path", required: true, schema: { type: "integer" } }]
            }),
            put: secured("Access", "Replace a COMPANY_USER's full module access checklist transactionally", {
                parameters: [{ name: "userId", in: "path", required: true, schema: { type: "integer" } }],
                requestBody: jsonBody(
                    {
                        modules: [
                            { module_id: 1, actions: ["can_view", "can_create"] },
                            { module_id: 2, actions: ["can_view"] }
                        ]
                    },
                    ["modules"]
                ),
                description:
                    "Only an administrator can save access for a different same-company COMPANY_USER. " +
                    "Self-access assignment is forbidden. The request replaces the complete checklist atomically. " +
                    "Allowed actions: Vehicles (including vehicle types, assignments, and documents), " +
                    "Drivers & Helpers, Bilty, and Clients use can_view, " +
                    "can_create, can_update, can_delete; Trips adds can_approve and can_dispatch; Trip Expenses " +
                    "and Trip Settlement use can_view, can_create, can_approve; Invoices adds can_approve to " +
                    "can_view, can_create, can_update, can_delete; Payments uses can_view, can_create, can_approve; " +
                    "Reports and Audit Logs allow only can_view. " +
                    "The former one-module POST and per-row DELETE routes are removed.",
                responses: {
                    200: { description: "Checklist saved and ACCESS_UPDATE audit logged" },
                    400: { description: "Unknown module, duplicate module, or unsupported action; no changes are saved" },
                    403: { description: "Only same-company COMPANY_USER targets can be managed; self assignment is forbidden" },
                    404: { description: "User not found in the current company" }
                }
            })
        },
        "/api/documents/expiring": {
            get: secured("Reports", "Documents expiring soon", {
                parameters: [{ name: "days", in: "query", schema: { type: "integer", default: 30 } }]
            })
        },
        "/api/reports/trips": {
            get: secured("Reports", "Trip counts by status", {
                parameters: [
                    { name: "from", in: "query", schema: { type: "string", format: "date" } },
                    { name: "to", in: "query", schema: { type: "string", format: "date" } }
                ]
            })
        },
        "/api/reports/finance": {
            get: secured("Reports", "Invoiced, received, and outstanding amounts")
        },
        "/api/reports/trip/{id}": {
            get: secured("Reports", "Advance, expenses, and settlement for one trip", {
                parameters: [idParam]
            })
        },
        "/api/audit-logs": {
            get: secured("Reports", "Who changed what. Needs Audit Logs view, admins always pass.", {
                parameters: listParams
            })
        }
    }
};

const resources = [
    ["Vehicles", "/api/vehicle-types", "vehicle type", { name: "Truck" }, ["name"]],
    ["Vehicles", "/api/vehicles", "vehicle", { vehicle_type_id: 1, registration_no: "MH12AB1234", capacity: 1000 }, ["vehicle_type_id", "registration_no"]],
    ["Drivers", "/api/drivers", "driver", { name: "Ramesh", mobile: "9000000001" }, ["name", "mobile"]],
    ["Helpers", "/api/helpers", "helper", { name: "Suresh", mobile: "9000000002" }, ["name", "mobile"]],
    ["Clients", "/api/clients", "client", { name: "Acme Corp", mobile: "8111111111", gst_number: "27AAAAA0000A1Z5" }, ["name"]],
    ["Bilty", "/api/bilties", "bilty", { bilty_number: "BLT-1001", client_id: 1, goods_description: "Steel", weight_kg: 500, packages: 10 }, ["bilty_number"]]
];

for (const [tag, path, summary, example, required] of resources) {
    spec.paths[path] = crud(tag, summary, example, required);
    spec.paths[`${path}/{id}`] = itemOps(tag, summary, example);
}

spec.paths["/api/vehicle-documents"] = {
    get: secured("Vehicles", "List vehicle documents", { parameters: listParams }),
    post: secured("Vehicles", "Upload a vehicle document", {
        requestBody: {
            required: true,
            content: {
                "multipart/form-data": {
                    schema: {
                        type: "object",
                        required: ["document_type", "vehicle_id"],
                        properties: {
                            vehicle_id: { type: "integer" },
                            document_type: { type: "string", example: "RC" },
                            document_number: { type: "string" },
                            issue_date: { type: "string", format: "date" },
                            expiry_date: { type: "string", format: "date" },
                            file: { type: "string", format: "binary" }
                        }
                    }
                }
            }
        },
        responses: created
    })
};

spec.paths["/api/vehicle-documents/{id}"] = {
    put: secured("Vehicles", "Update a vehicle document", {
        parameters: [idParam],
        requestBody: {
            content: {
                "multipart/form-data": {
                    schema: {
                        type: "object",
                        properties: {
                            document_type: { type: "string" },
                            document_number: { type: "string" },
                            expiry_date: { type: "string", format: "date" },
                            file: { type: "string", format: "binary" }
                        }
                    }
                }
            }
        }
    }),
    delete: secured("Vehicles", "Deactivate a vehicle document", { parameters: [idParam] })
};

spec.paths["/api/driver-documents"] = {
    get: secured("Drivers", "List driver documents", { parameters: listParams }),
    post: secured("Drivers", "Upload a driver document", {
        requestBody: {
            required: true,
            content: {
                "multipart/form-data": {
                    schema: {
                        type: "object",
                        required: ["driver_id", "document_type"],
                        properties: {
                            driver_id: { type: "integer" },
                            document_type: { type: "string", example: "LICENSE" },
                            document_number: { type: "string" },
                            expiry_date: { type: "string", format: "date" },
                            file: { type: "string", format: "binary" }
                        }
                    }
                }
            }
        },
        responses: created
    })
};

spec.paths["/api/driver-documents/{id}"] = itemOps("Drivers", "driver document", {
    document_type: "LICENSE"
});

spec.paths["/api/helper-documents"] = {
    get: secured("Helpers", "List helper documents", { parameters: listParams }),
    post: secured("Helpers", "Upload a helper document", {
        requestBody: {
            required: true,
            content: {
                "multipart/form-data": {
                    schema: {
                        type: "object",
                        required: ["helper_id", "document_type"],
                        properties: {
                            helper_id: { type: "integer" },
                            document_type: { type: "string", example: "ID" },
                            file: { type: "string", format: "binary" }
                        }
                    }
                }
            }
        },
        responses: created
    })
};

spec.paths["/api/helper-documents/{id}"] = itemOps("Helpers", "helper document", {
    document_type: "ID"
});

spec.paths["/api/vehicle-assignments"] = crud(
    "Vehicles",
    "vehicle assignment",
    { vehicle_id: 1, driver_id: 1, helper_id: 1, start_date: "2026-11-04" },
    ["vehicle_id", "start_date"]
);
spec.paths["/api/vehicle-assignments/{id}"] = itemOps(
    "Vehicles",
    "vehicle assignment",
    { end_date: "2026-11-10" }
);
spec.paths["/api/vehicle-assignments/{id}/close"] = {
    patch: secured("Vehicles", "Close an assignment", { parameters: [idParam] })
};

spec.paths["/api/trips"] = crud(
    "Trips",
    "trip",
    {
        vehicle_id: 1,
        driver_id: 1,
        source: "Pune",
        destination: "Mumbai",
        stops: [{ city: "Lonavala", sequence: 1 }]
    },
    ["vehicle_id", "driver_id", "source", "destination"]
);
spec.paths["/api/trips/{id}"] = itemOps("Trips", "trip", {
    source: "Pune",
    destination: "Mumbai"
});
spec.paths["/api/trips/{id}/status"] = {
    patch: secured("Trips", "Change trip status. Invalid jumps return 400.", {
        parameters: [idParam],
        requestBody: jsonBody({ status: "DISPATCHED" }, ["status"]),
        description: "Order: CREATED, DISPATCHED, IN_TRANSIT, DELIVERED, COMPLETED. CANCELLED is allowed until the trip is completed."
    })
};
spec.paths["/api/trips/{id}/route"] = {
    get: secured("Trips", "Trip stops in sequence", { parameters: [idParam] })
};
spec.paths["/api/trips/{id}/stops"] = {
    post: secured("Trips", "Replace trip stops", {
        parameters: [idParam],
        requestBody: jsonBody({
            stops: [{ city: "Lonavala", address: "Highway", sequence: 1, status: "PENDING" }]
        })
    })
};

const statusPatch = (tag, summary, exampleStatus) => ({
    patch: secured(tag, `Update ${summary} status`, {
        parameters: [idParam],
        requestBody: jsonBody({ status: exampleStatus }, ["status"])
    })
});

spec.paths["/api/trip-advances"] = crud(
    "Trips",
    "trip advance",
    { trip_id: 1, amount: 500, payment_method: "CASH" },
    ["trip_id", "amount"]
);
spec.paths["/api/trip-advances/{id}"] = {
    get: secured("Trips", "Get a trip advance", { parameters: [idParam] })
};
spec.paths["/api/trip-advances/{id}/status"] = statusPatch("Trips", "trip advance", "APPROVED");

spec.paths["/api/trip-expenses"] = crud(
    "Trips",
    "trip expense",
    { trip_id: 1, expense_type: "FUEL", requested_amount: 800 },
    ["trip_id", "expense_type", "requested_amount"]
);
spec.paths["/api/trip-expenses/{id}"] = {
    get: secured("Trips", "Get a trip expense", { parameters: [idParam] })
};
spec.paths["/api/trip-expenses/{id}/status"] = statusPatch("Trips", "trip expense", "APPROVED");

spec.paths["/api/trip-final-reports"] = crud(
    "Trips",
    "trip final report",
    { trip_id: 1, report_no: "FR-1", loaded_quantity: 500, total_distance_km: 150 },
    ["trip_id", "report_no"]
);
spec.paths["/api/trip-final-reports/{id}"] = {
    get: secured("Trips", "Get a final report", { parameters: [idParam] })
};
spec.paths["/api/trip-final-reports/{id}/status"] = statusPatch("Trips", "final report", "VERIFIED");

spec.paths["/api/trip-settlements"] = crud(
    "Trips",
    "trip settlement",
    { trip_id: 1, remarks: "Driver settlement" },
    ["trip_id"]
);
spec.paths["/api/trip-settlements/{id}"] = {
    get: secured("Trips", "Get a settlement", { parameters: [idParam] })
};
spec.paths["/api/trip-settlements/{id}/status"] = statusPatch("Trips", "settlement", "SETTLED");

spec.paths["/api/invoices"] = {
    get: secured("Invoices", "List invoices. Use overdue=1 for unpaid past due date.", {
        parameters: [
            ...listParams,
            { name: "overdue", in: "query", schema: { type: "string", enum: ["1"] } }
        ]
    }),
    post: secured("Invoices", "Create a draft invoice", {
        requestBody: jsonBody(
            {
                client_id: 1,
                invoice_number: "INV-1001",
                invoice_date: "2026-11-04",
                tax_amount: 18,
                items: [{ description: "Freight", freight: 1000, trip_id: 1 }]
            },
            ["client_id", "invoice_number", "invoice_date"]
        ),
        responses: created
    })
};
spec.paths["/api/invoices/{id}"] = itemOps("Invoices", "invoice", {
    client_id: 1,
    invoice_date: "2026-11-04",
    items: [{ description: "Freight", freight: 1000 }]
});
spec.paths["/api/invoices/{id}/print"] = {
    get: secured("Invoices", "Printable HTML invoice", { parameters: [idParam] })
};
spec.paths["/api/invoices/{id}/status"] = statusPatch("Invoices", "invoice", "SENT");

spec.paths["/api/invoice-payments"] = crud(
    "Payments",
    "invoice payment",
    {
        invoice_id: 1,
        payment_date: "2026-11-04",
        payment_method: "UPI",
        gross_amount: 500,
        reference_no: "UPI123"
    },
    ["invoice_id", "payment_date", "payment_method"]
);
spec.paths["/api/invoice-payments/{id}"] = {
    get: secured("Payments", "Get a payment", { parameters: [idParam] })
};
spec.paths["/api/invoice-payments/{id}/status"] = statusPatch(
    "Payments",
    "payment",
    "CONFIRMED"
);

spec.paths["/api/invoice-payment-deductions"] = crud(
    "Payments",
    "payment deduction",
    { invoice_payment_id: 1, deduction_type: "TDS", amount: 50 },
    ["invoice_payment_id", "deduction_type", "amount"]
);
spec.paths["/api/invoice-payment-deductions/{id}"] = {
    get: secured("Payments", "Get a deduction", { parameters: [idParam] })
};

module.exports = spec;
